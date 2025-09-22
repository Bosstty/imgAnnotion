// utils/exportUtils.js - 数据导出工具类

import JSZip from 'jszip';

export class ExportUtils {
    /**
     * 从URL获取文件二进制数据
     * @param {string} url - 文件URL（blob URL或普通URL）
     * @returns {Promise<ArrayBuffer>} 文件二进制数据
     */
    static async fetchFileData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`获取文件失败: ${response.status} ${response.statusText}`);
            }
            return await response.arrayBuffer();
        } catch (error) {
            console.error('获取文件数据失败:', error);
            throw error;
        }
    }

    /**
     * 批量获取文件数据
     * @param {Array} files - 文件列表
     * @returns {Promise<Map>} 文件ID到数据的映射
     */
    static async batchFetchFileData(files) {
        const fileDataMap = new Map();
        const fetchPromises = files.map(async file => {
            try {
                const fileData = await this.fetchFileData(file.url);
                fileDataMap.set(file.id, {
                    data: fileData,
                    name: file.name,
                    width: file.width,
                    height: file.height,
                });
            } catch (error) {
                console.error(`获取文件 ${file.name} 数据失败:`, error);
                fileDataMap.set(file.id, {
                    error: error.message,
                    name: file.name,
                    width: file.width,
                    height: file.height,
                });
            }
        });

        await Promise.all(fetchPromises);
        return fileDataMap;
    }

    /**
     * 导出YOLO格式数据
     * @param {Array} files - 文件列表
     * @param {Object} annotationsData - 标注数据
     * @param {Array} categories - 分类列表
     * @param {Object} options - 导出选项
     * @returns {Promise<Object>} 导出结果
     */
    static async exportYOLO(files, annotationsData, categories, options = {}) {
        try {
            const zip = new JSZip();
            const imagesFolder = zip.folder('images');
            const labelsFolder = zip.folder('labels');

            const categoryMap = {};
            categories.forEach((category, index) => {
                categoryMap[category.id] = index;
            });

            const classesContent = categories.map(cat => cat.name).join('\n');
            zip.file('classes.txt', classesContent);

            let totalAnnotations = 0;
            let processedFiles = 0;
            let failedFiles = 0;

            const fileDataMap = await this.batchFetchFileData(files);

            // 处理每个文件
            for (const file of files) {
                const annotations = annotationsData[file.id] || [];

                // 如果没有标注且不包含空文件，跳过
                if (annotations.length === 0 && !options.includeEmpty) {
                    continue;
                }

                const fileInfo = fileDataMap.get(file.id);
                if (!fileInfo || fileInfo.error) {
                    console.error(
                        `跳过文件 ${file.name}: ${fileInfo?.error || '无法获取文件数据'}`
                    );
                    failedFiles++;
                    continue;
                }

                processedFiles++;
                totalAnnotations += annotations.length;

                // 添加图片文件
                imagesFolder.file(file.name, fileInfo.data);

                // 验证标注数据
                const validatedAnnotations = this.validateAnnotations(
                    annotations,
                    file.width,
                    file.height
                );

                // 创建对应的标注文件
                const baseName = file.name.replace(/\.[^/.]+$/, '');
                const yoloContent = this.convertToYOLOFormat(
                    validatedAnnotations,
                    categoryMap,
                    file.width,
                    file.height,
                    options.normalizeCoords !== false
                );

                labelsFolder.file(`${baseName}.txt`, yoloContent);
            }

            // 创建数据集配置文件
            const configContent = this.generateYOLOConfig(
                categories,
                processedFiles,
                totalAnnotations
            );
            zip.file('dataset.yaml', configContent);

            // 创建README文件
            const readmeContent = this.generateReadme('YOLO', {
                files: processedFiles,
                annotations: totalAnnotations,
                categories: categories.length,
                failed: failedFiles,
            });
            zip.file('README.md', readmeContent);

            // 生成并下载zip文件
            console.log('正在生成压缩文件...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
            });

            this.downloadFile(zipBlob, `yolo_dataset_${this.generateTimestamp()}.zip`);

            return {
                success: true,
                message: `成功导出${processedFiles}个文件，共${totalAnnotations}个标注${
                    failedFiles > 0 ? `，${failedFiles}个文件失败` : ''
                }`,
                stats: {
                    files: processedFiles,
                    annotations: totalAnnotations,
                    failed: failedFiles,
                },
            };
        } catch (error) {
            console.error('YOLO导出失败:', error);
            return {
                success: false,
                message: '导出失败: ' + error.message,
            };
        }
    }

    /**
     * 导出COCO格式数据
     * @param {Array} files - 文件列表
     * @param {Object} annotationsData - 标注数据
     * @param {Array} categories - 分类列表
     * @param {Object} options - 导出选项
     * @returns {Promise<Object>} 导出结果
     */
    static async exportCOCO(files, annotationsData, categories, options = {}) {
        try {
            const zip = new JSZip();
            const imagesFolder = zip.folder('images');

            // COCO格式数据结构
            const cocoData = {
                info: {
                    description: '港口巡检智能标注系统导出数据',
                    version: '1.0',
                    year: new Date().getFullYear(),
                    contributor: 'Port Annotation System',
                    date_created: new Date().toISOString(),
                },
                licenses: [
                    {
                        id: 1,
                        name: 'Custom License',
                        url: '',
                    },
                ],
                images: [],
                annotations: [],
                categories: categories.map((cat, index) => ({
                    id: index + 1,
                    name: cat.name,
                    supercategory: 'port_equipment',
                })),
            };

            // 创建类别映射
            const categoryMap = {};
            categories.forEach((category, index) => {
                categoryMap[category.id] = index + 1;
            });

            let annotationId = 1;
            let totalAnnotations = 0;
            let processedFiles = 0;
            let failedFiles = 0;

            // 批量获取文件数据
            console.log('正在获取文件数据...');
            const fileDataMap = await this.batchFetchFileData(files);

            // 处理每个文件
            for (const file of files) {
                const annotations = annotationsData[file.id] || [];

                // 如果没有标注且不包含空文件，跳过
                if (annotations.length === 0 && !options.includeEmpty) {
                    continue;
                }

                const fileInfo = fileDataMap.get(file.id);
                if (!fileInfo || fileInfo.error) {
                    console.error(
                        `跳过文件 ${file.name}: ${fileInfo?.error || '无法获取文件数据'}`
                    );
                    failedFiles++;
                    continue;
                }

                processedFiles++;

                // 添加图片文件
                imagesFolder.file(file.name, fileInfo.data);

                // 添加图像信息
                cocoData.images.push({
                    id: file.id,
                    width: file.width,
                    height: file.height,
                    file_name: file.name,
                    license: 1,
                    flickr_url: '',
                    coco_url: '',
                    date_captured: new Date().toISOString(),
                });

                // 验证并添加标注信息
                const validatedAnnotations = this.validateAnnotations(
                    annotations,
                    file.width,
                    file.height
                );

                validatedAnnotations.forEach(annotation => {
                    cocoData.annotations.push({
                        id: annotationId++,
                        image_id: file.id,
                        category_id: categoryMap[annotation.categoryId],
                        segmentation: [],
                        area: annotation.width * annotation.height,
                        bbox: [annotation.x, annotation.y, annotation.width, annotation.height],
                        iscrowd: 0,
                    });
                    totalAnnotations++;
                });
            }

            // 生成JSON文件并添加到zip
            const jsonContent = JSON.stringify(cocoData, null, 2);
            zip.file('annotations.json', jsonContent);

            // 创建README文件
            const readmeContent = this.generateReadme('COCO', {
                files: processedFiles,
                annotations: totalAnnotations,
                categories: categories.length,
                failed: failedFiles,
            });
            zip.file('README.md', readmeContent);

            // 生成并下载zip文件
            console.log('正在生成压缩文件...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
            });

            this.downloadFile(zipBlob, `coco_dataset_${this.generateTimestamp()}.zip`);

            return {
                success: true,
                message: `成功导出COCO格式数据，共${processedFiles}个图像，${totalAnnotations}个标注${
                    failedFiles > 0 ? `，${failedFiles}个文件失败` : ''
                }`,
                stats: {
                    images: processedFiles,
                    annotations: totalAnnotations,
                    categories: categories.length,
                    failed: failedFiles,
                },
            };
        } catch (error) {
            console.error('COCO导出失败:', error);
            return {
                success: false,
                message: '导出失败: ' + error.message,
            };
        }
    }

    /**
     * 导出PASCAL VOC格式数据
     * @param {Array} files - 文件列表
     * @param {Object} annotationsData - 标注数据
     * @param {Array} categories - 分类列表
     * @param {Object} options - 导出选项
     * @returns {Promise<Object>} 导出结果
     */
    static async exportPascalVOC(files, annotationsData, categories, options = {}) {
        try {
            const zip = new JSZip();
            const annotationsFolder = zip.folder('Annotations');
            const imagesFolder = zip.folder('JPEGImages');
            const imageSetsFolder = zip.folder('ImageSets').folder('Main');

            let processedFiles = 0;
            let totalAnnotations = 0;
            let failedFiles = 0;
            const fileList = [];

            // 批量获取文件数据
            console.log('正在获取文件数据...');
            const fileDataMap = await this.batchFetchFileData(files);

            // 处理每个文件
            for (const file of files) {
                const annotations = annotationsData[file.id] || [];

                // 如果没有标注且不包含空文件，跳过
                if (annotations.length === 0 && !options.includeEmpty) {
                    continue;
                }

                const fileInfo = fileDataMap.get(file.id);
                if (!fileInfo || fileInfo.error) {
                    console.error(
                        `跳过文件 ${file.name}: ${fileInfo?.error || '无法获取文件数据'}`
                    );
                    failedFiles++;
                    continue;
                }

                processedFiles++;
                totalAnnotations += annotations.length;

                const baseName = file.name.replace(/\.[^/.]+$/, '');
                fileList.push(baseName);

                // 添加图片文件
                imagesFolder.file(file.name, fileInfo.data);

                // 验证标注数据
                const validatedAnnotations = this.validateAnnotations(
                    annotations,
                    file.width,
                    file.height
                );

                // 创建XML标注文件
                const xmlContent = this.generatePascalVOCXML(
                    file,
                    validatedAnnotations,
                    categories
                );
                annotationsFolder.file(`${baseName}.xml`, xmlContent);
            }

            // 创建图像集合文件
            const trainvalContent = fileList.join('\n');
            imageSetsFolder.file('trainval.txt', trainvalContent);
            imageSetsFolder.file('train.txt', trainvalContent);

            // 创建类别文件
            const classesContent = categories.map(cat => cat.name).join('\n');
            zip.file('classes.txt', classesContent);

            // 创建README文件
            const readmeContent = this.generateReadme('PASCAL VOC', {
                files: processedFiles,
                annotations: totalAnnotations,
                categories: categories.length,
                failed: failedFiles,
            });
            zip.file('README.md', readmeContent);

            // 生成并下载zip文件
            console.log('正在生成压缩文件...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
            });

            this.downloadFile(zipBlob, `pascal_voc_dataset_${this.generateTimestamp()}.zip`);

            return {
                success: true,
                message: `成功导出PASCAL VOC格式数据，共${processedFiles}个文件，${totalAnnotations}个标注${
                    failedFiles > 0 ? `，${failedFiles}个文件失败` : ''
                }`,
                stats: {
                    files: processedFiles,
                    annotations: totalAnnotations,
                    failed: failedFiles,
                },
            };
        } catch (error) {
            console.error('PASCAL VOC导出失败:', error);
            return {
                success: false,
                message: '导出失败: ' + error.message,
            };
        }
    }

    /**
     * 转换为YOLO格式
     * @param {Array} annotations - 标注数据
     * @param {Object} categoryMap - 分类映射
     * @param {number} imageWidth - 图像宽度
     * @param {number} imageHeight - 图像高度
     * @param {boolean} normalize - 是否归一化坐标
     * @returns {string} YOLO格式内容
     */
    static convertToYOLOFormat(
        annotations,
        categoryMap,
        imageWidth,
        imageHeight,
        normalize = true
    ) {
        return annotations
            .map(annotation => {
                const categoryId = categoryMap[annotation.categoryId] || 0;

                if (normalize) {
                    const centerX = (annotation.x + annotation.width / 2) / imageWidth;
                    const centerY = (annotation.y + annotation.height / 2) / imageHeight;
                    const width = annotation.width / imageWidth;
                    const height = annotation.height / imageHeight;

                    return `${categoryId} ${centerX.toFixed(6)} ${centerY.toFixed(
                        6
                    )} ${width.toFixed(6)} ${height.toFixed(6)}`;
                } else {
                    // 绝对坐标格式
                    const centerX = annotation.x + annotation.width / 2;
                    const centerY = annotation.y + annotation.height / 2;

                    return `${categoryId} ${centerX} ${centerY} ${annotation.width} ${annotation.height}`;
                }
            })
            .join('\n');
    }

    /**
     * 生成YOLO配置文件
     * @param {Array} categories - 分类列表
     * @param {number} fileCount - 文件数量
     * @param {number} annotationCount - 标注数量
     * @returns {string} 配置文件内容
     */
    static generateYOLOConfig(categories, fileCount, annotationCount) {
        return `# Port Inspection Dataset Configuration
                # Generated by Port Annotation System

                # Dataset info
                path: ./dataset
                train: images
                val: images
                test: images

                # Number of classes
                nc: ${categories.length}

                # Class names
                names:
                ${categories.map((cat, index) => `  ${index}: ${cat.name}`).join('\n')}

                # Statistics
                # Files: ${fileCount}
                # Annotations: ${annotationCount}
                # Generated: ${new Date().toISOString()}
                `;
    }

    /**
     * 生成PASCAL VOC XML文件
     * @param {Object} file - 文件信息
     * @param {Array} annotations - 标注数据
     * @param {Array} categories - 分类列表
     * @returns {string} XML内容
     */
    static generatePascalVOCXML(file, annotations, categories) {
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.id] = cat.name;
        });

        const objectsXml = annotations
            .map(annotation => {
                const categoryName = categoryMap[annotation.categoryId] || 'unknown';

                return `    <object>
                            <name>${categoryName}</name>
                            <pose>Unspecified</pose>
                            <truncated>0</truncated>
                            <difficult>0</difficult>
                            <bndbox>
                                <xmin>${Math.round(annotation.x)}</xmin>
                                <ymin>${Math.round(annotation.y)}</ymin>
                                <xmax>${Math.round(annotation.x + annotation.width)}</xmax>
                                <ymax>${Math.round(annotation.y + annotation.height)}</ymax>
                            </bndbox>
                        </object>`;
            })
            .join('\n');

        return `<annotation>
                        <folder>JPEGImages</folder>
                        <filename>${file.name}</filename>
                        <path>${file.name}</path>
                        <source>
                            <database>Port Annotation System</database>
                        </source>
                        <size>
                            <width>${file.width}</width>
                            <height>${file.height}</height>
                            <depth>3</depth>
                        </size>
                        <segmented>0</segmented>
                    ${objectsXml}
                    </annotation>`;
    }

    /**
     * 生成README文件
     * @param {string} format - 数据格式
     * @param {Object} stats - 统计信息
     * @returns {string} README内容
     */
    static generateReadme(format, stats) {
        return `# ${format} Dataset Export

                ## 数据集信息
                - **导出格式**: ${format}
                - **导出时间**: ${new Date().toLocaleString()}
                - **文件数量**: ${stats.files}
                - **标注数量**: ${stats.annotations}
                - **类别数量**: ${stats.categories}
                ${stats.failed > 0 ? `- **失败文件**: ${stats.failed}` : ''}

                ## 文件结构
                ${this.getFormatStructure(format)}

                ## 使用说明
                ${this.getFormatUsage(format)}

                ---
                *Generated by Port Annotation System*
                `;
    }

    /**
     * 获取格式结构说明
     * @param {string} format - 数据格式
     * @returns {string} 结构说明
     */
    static getFormatStructure(format) {
        const structures = {
            YOLO: `\`\`\`
                  dataset/
                  ├── images/           # 图像文件
                  ├── labels/           # 标注文件
                  ├── classes.txt       # 类别列表
                  ├── dataset.yaml      # 数据集配置
                  └── README.md         # 说明文档
                  \`\`\``,
            COCO: `\`\`\`
                  dataset/
                  ├── images/           # 图像文件
                  ├── annotations.json  # COCO格式标注
                  └── README.md         # 说明文档
                  \`\`\``,
            'PASCAL VOC': `\`\`\`
                  dataset/
                  ├── JPEGImages/       # 图像文件
                  ├── Annotations/      # XML标注文件
                  ├── ImageSets/
                  │   └── Main/
                  │       ├── train.txt
                  │       └── trainval.txt
                  ├── classes.txt       # 类别列表
                  └── README.md         # 说明文档
                  \`\`\``,
        };
        return structures[format] || '';
    }

    /**
     * 获取格式使用说明
     * @param {string} format - 数据格式
     * @returns {string} 使用说明
     */
    static getFormatUsage(format) {
        const usages = {
            YOLO: '该数据集可直接用于YOLOv5/YOLOv8等模型训练。标注坐标已归一化处理。',
            COCO: '该数据集采用COCO格式，可用于目标检测、实例分割等任务。',
            'PASCAL VOC': '该数据集采用PASCAL VOC格式，每个图像对应一个XML标注文件。',
        };
        return usages[format] || '';
    }

    /**
     * 生成时间戳
     * @returns {string} 时间戳字符串
     */
    static generateTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }

    /**
     * 下载文件
     * @param {Blob} blob - 文件数据
     * @param {string} filename - 文件名
     */
    static downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 延迟释放URL对象
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    /**
     * 验证标注数据
     * @param {Array} annotations - 标注数据
     * @param {number} imageWidth - 图像宽度
     * @param {number} imageHeight - 图像高度
     * @returns {Array} 验证后的标注数据
     */
    static validateAnnotations(annotations, imageWidth, imageHeight) {
        return annotations.filter(annotation => {
            // 检查标注是否在图像范围内
            if (
                annotation.x < 0 ||
                annotation.y < 0 ||
                annotation.x + annotation.width > imageWidth ||
                annotation.y + annotation.height > imageHeight
            ) {
                console.warn('标注超出图像边界:', annotation);
                return false;
            }

            // 检查标注尺寸是否有效
            if (annotation.width <= 0 || annotation.height <= 0) {
                console.warn('无效的标注尺寸:', annotation);
                return false;
            }

            return true;
        });
    }

    /**
     * 计算标注统计信息
     * @param {Object} annotationsData - 标注数据
     * @param {Array} categories - 分类列表
     * @returns {Object} 统计信息
     */
    static calculateStatistics(annotationsData, categories) {
        const stats = {
            totalFiles: 0,
            totalAnnotations: 0,
            categoryCounts: {},
            averageAnnotationsPerImage: 0,
            filesWithAnnotations: 0,
            emptyFiles: 0,
        };

        // 初始化分类计数
        categories.forEach(cat => {
            stats.categoryCounts[cat.name] = 0;
        });

        // 遍历所有文件的标注数据
        Object.values(annotationsData).forEach(annotations => {
            stats.totalFiles++;

            if (annotations.length > 0) {
                stats.filesWithAnnotations++;
                stats.totalAnnotations += annotations.length;

                // 统计各分类数量
                annotations.forEach(annotation => {
                    const category = categories.find(cat => cat.id === annotation.categoryId);
                    if (category) {
                        stats.categoryCounts[category.name]++;
                    }
                });
            } else {
                stats.emptyFiles++;
            }
        });

        // 计算平均值
        stats.averageAnnotationsPerImage =
            stats.totalFiles > 0 ? (stats.totalAnnotations / stats.totalFiles).toFixed(2) : 0;

        return stats;
    }
}
