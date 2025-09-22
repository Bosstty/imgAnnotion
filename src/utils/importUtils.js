// utils/importUtils.js - 数据导入工具类

import JSZip from 'jszip';

export class ImportUtils {
    /**
     * 导入ZIP文件的主入口
     * @param {File} zipFile - ZIP文件
     * @param {Object} options - 导入选项
     * @returns {Promise<Object>} 导入结果
     */
    static async importZip(zipFile, options = {}) {
        try {
            const zip = await this.unzipFile(zipFile);
            const formatInfo = await this.detectFormat(zip);
            console.log('检测到的格式:', formatInfo);

            if (!formatInfo.format) {
                throw new Error('无法识别导入文件的格式，请确保文件是由本系统导出的数据包');
            }

            let importedData;
            switch (formatInfo.format) {
                case 'YOLO':
                    importedData = await this.parseYOLOFormat(zip, formatInfo, options);
                    break;
                case 'COCO':
                    importedData = await this.parseCOCOFormat(zip, formatInfo, options);
                    break;
                case 'PASCAL_VOC':
                    importedData = await this.parsePascalVOCFormat(zip, formatInfo, options);
                    break;
                default:
                    throw new Error(`不支持的格式类型: ${formatInfo.format}`);
            }

            const validationResult = this.validateImportedData(importedData);
            if (!validationResult.isValid) {
                throw new Error(`数据验证失败: ${validationResult.errors.join(', ')}`);
            }

            return {
                success: true,
                format: formatInfo.format,
                data: importedData,
                stats: this.calculateImportStats(importedData),
                message: `成功导入${formatInfo.format}格式数据`,
            };
        } catch (error) {
            console.error('导入失败:', error);
            return {
                success: false,
                message: error.message || '导入失败',
                error: error,
            };
        }
    }

    /**
     * 解压ZIP文件
     * @param {File} zipFile - ZIP文件
     * @returns {Promise<JSZip>} JSZip对象
     */
    static async unzipFile(zipFile) {
        try {
            const zip = new JSZip();
            const content = await zipFile.arrayBuffer();
            return await zip.loadAsync(content);
        } catch (error) {
            throw new Error('解压文件失败: ' + error.message);
        }
    }

    /**
     * 检测数据格式类型
     * @param {JSZip} zip - JSZip对象
     * @returns {Promise<Object>} 格式信息
     */
    static async detectFormat(zip) {
        const files = Object.keys(zip.files);
        console.log('ZIP包含的文件:', files);

        const hasImages = files.some(f => f.includes('images/') || f.includes('JPEGImages/'));
        const hasLabels = files.some(f => f.includes('labels/'));
        const hasAnnotationsJson = files.some(f => f.includes('annotations.json'));
        const hasAnnotationsFolder = files.some(f => f.includes('Annotations/'));
        const hasClassesTxt = files.some(f => f.includes('classes.txt'));
        const hasDatasetYaml = files.some(f => f.includes('dataset.yaml'));
        const hasImageSets = files.some(f => f.includes('ImageSets/'));

        // YOLO格式特征：images/ + labels/ + classes.txt/dataset.yaml
        if (hasImages && hasLabels && (hasClassesTxt || hasDatasetYaml)) {
            return {
                format: 'YOLO',
                hasDatasetConfig: hasDatasetYaml,
                hasClasses: hasClassesTxt,
            };
        }

        // COCO格式特征：images/ + annotations.json
        if (hasImages && hasAnnotationsJson) {
            return {
                format: 'COCO',
                annotationFile: files.find(f => f.includes('annotations.json')),
            };
        }

        // PASCAL VOC格式特征：JPEGImages/ + Annotations/ + ImageSets/
        if ((hasImages || files.some(f => f.includes('JPEGImages/'))) && hasAnnotationsFolder) {
            return {
                format: 'PASCAL_VOC',
                hasImageSets: hasImageSets,
            };
        }

        // 尝试通过README文件内容判断
        const readmeFile = files.find(f => f.toLowerCase().includes('readme'));
        if (readmeFile) {
            const readmeContent = await zip.file(readmeFile).async('string');
            if (readmeContent.includes('YOLO')) return { format: 'YOLO' };
            if (readmeContent.includes('COCO')) return { format: 'COCO' };
            if (readmeContent.includes('PASCAL VOC')) return { format: 'PASCAL_VOC' };
        }

        return { format: null };
    }

    /**
     * 解析YOLO格式数据
     * @param {JSZip} zip - JSZip对象
     * @param {Object} formatInfo - 格式信息
     * @param {Object} options - 导入选项
     * @returns {Promise<Object>} 解析后的数据
     */
    static async parseYOLOFormat(zip, formatInfo, options) {
        console.log('解析YOLO格式数据...');

        const result = {
            files: [],
            categories: [],
            annotations: {},
            errors: [],
        };

        try {
            let categories = [];
            if (formatInfo.hasDatasetConfig) {
                const yamlFile = Object.keys(zip.files).find(f => f.includes('dataset.yaml'));
                if (yamlFile) {
                    const yamlContent = await zip.file(yamlFile).async('string');
                    categories = this.parseYAMLCategories(yamlContent);
                }
            }

            if (categories.length === 0 && formatInfo.hasClasses) {
                const classesFile = Object.keys(zip.files).find(f => f.includes('classes.txt'));
                if (classesFile) {
                    const classesContent = await zip.file(classesFile).async('string');
                    categories = this.parseClassesTxt(classesContent);
                }
            }

            result.categories = categories;

            const imageFiles = Object.keys(zip.files).filter(
                f =>
                    f.includes('images/') &&
                    !f.endsWith('/') &&
                    /\.(jpg|jpeg|png|bmp|webp)$/i.test(f)
            );

            for (const imagePath of imageFiles) {
                try {
                    const imageName = imagePath.split('/').pop();
                    const baseName = imageName.replace(/\.[^/.]+$/, '');

                    const imageData = await zip.file(imagePath).async('blob');
                    const imageUrl = URL.createObjectURL(imageData);

                    const dimensions = await this.getImageDimensions(imageUrl);

                    const fileId = result.files.length + 1;
                    const fileObj = {
                        id: fileId,
                        name: imageName,
                        url: imageUrl,
                        width: dimensions.width,
                        height: dimensions.height,
                        size: `${dimensions.width}×${dimensions.height}`,
                        fileSize: this.formatFileSize(imageData.size),
                        uploadTime: new Date().toLocaleString(),
                    };

                    result.files.push(fileObj);

                    const labelPath = `labels/${baseName}.txt`;
                    const labelFile = zip.file(labelPath);

                    if (labelFile) {
                        const labelContent = await labelFile.async('string');
                        const annotations = this.parseYOLOAnnotations(
                            labelContent,
                            dimensions.width,
                            dimensions.height,
                            categories
                        );
                        result.annotations[fileId] = annotations;
                    } else {
                        result.annotations[fileId] = [];
                    }
                } catch (error) {
                    console.error(`处理图片 ${imagePath} 失败:`, error);
                    result.errors.push(`图片 ${imagePath}: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('解析YOLO格式失败:', error);
            throw error;
        }

        return result;
    }

    /**
     * 解析COCO格式数据
     * @param {JSZip} zip - JSZip对象
     * @param {Object} formatInfo - 格式信息
     * @param {Object} options - 导入选项
     * @returns {Promise<Object>} 解析后的数据
     */
    static async parseCOCOFormat(zip, formatInfo, options) {
        console.log('解析COCO格式数据...');

        const result = {
            files: [],
            categories: [],
            annotations: {},
            errors: [],
        };

        try {
            // 1. 读取annotations.json
            const annotationFile = zip.file(formatInfo.annotationFile);
            if (!annotationFile) {
                throw new Error('找不到annotations.json文件');
            }

            const jsonContent = await annotationFile.async('string');
            const cocoData = JSON.parse(jsonContent);

            // 2. 解析类别
            if (cocoData.categories) {
                result.categories = cocoData.categories.map((cat, index) => ({
                    id: index,
                    name: cat.name,
                    color: this.generateCategoryColor(index),
                }));
            }

            // 创建类别ID映射（COCO ID -> 系统内部ID）
            const categoryMap = {};
            cocoData.categories.forEach((cat, index) => {
                categoryMap[cat.id] = index;
            });

            // 3. 处理图片
            const imageMap = {};
            for (const cocoImage of cocoData.images) {
                try {
                    const imagePath = `images/${cocoImage.file_name}`;
                    const imageFile = zip.file(imagePath);

                    if (!imageFile) {
                        console.warn(`找不到图片文件: ${imagePath}`);
                        continue;
                    }

                    const imageData = await imageFile.async('blob');
                    const imageUrl = URL.createObjectURL(imageData);

                    const fileId = result.files.length + 1;
                    const fileObj = {
                        id: fileId,
                        name: cocoImage.file_name,
                        url: imageUrl,
                        width: cocoImage.width,
                        height: cocoImage.height,
                        size: `${cocoImage.width}×${cocoImage.height}`,
                        fileSize: this.formatFileSize(imageData.size),
                        uploadTime: new Date().toLocaleString(),
                    };

                    result.files.push(fileObj);
                    result.annotations[fileId] = [];

                    // 保存COCO图片ID到系统文件ID的映射
                    imageMap[cocoImage.id] = fileId;
                } catch (error) {
                    console.error(`处理图片 ${cocoImage.file_name} 失败:`, error);
                    result.errors.push(`图片 ${cocoImage.file_name}: ${error.message}`);
                }
            }

            // 4. 处理标注
            let annotationId = 1;
            for (const cocoAnn of cocoData.annotations) {
                const fileId = imageMap[cocoAnn.image_id];
                if (!fileId) continue;

                const categoryId = categoryMap[cocoAnn.category_id];
                const category = result.categories[categoryId];

                const annotation = {
                    id: annotationId++,
                    categoryId: categoryId,
                    x: Math.round(cocoAnn.bbox[0]),
                    y: Math.round(cocoAnn.bbox[1]),
                    width: Math.round(cocoAnn.bbox[2]),
                    height: Math.round(cocoAnn.bbox[3]),
                    title: `${category?.name || '未知'} #${String(annotationId).padStart(4, '0')}`,
                    createTime: new Date().toLocaleString(),
                };

                result.annotations[fileId].push(annotation);
            }
        } catch (error) {
            console.error('解析COCO格式失败:', error);
            throw error;
        }

        return result;
    }

    /**
     * 解析PASCAL VOC格式数据
     * @param {JSZip} zip - JSZip对象
     * @param {Object} formatInfo - 格式信息
     * @param {Object} options - 导入选项
     * @returns {Promise<Object>} 解析后的数据
     */
    static async parsePascalVOCFormat(zip, formatInfo, options) {
        console.log('解析PASCAL VOC格式数据...');

        const result = {
            files: [],
            categories: [],
            annotations: {},
            errors: [],
        };

        try {
            // 1. 获取类别信息
            const classesFile = Object.keys(zip.files).find(f => f.includes('classes.txt'));
            if (classesFile) {
                const classesContent = await zip.file(classesFile).async('string');
                result.categories = this.parseClassesTxt(classesContent);
            }

            // 2. 获取所有图片文件
            const imageFolder = Object.keys(zip.files).some(f => f.includes('JPEGImages/'))
                ? 'JPEGImages/'
                : 'images/';

            const imageFiles = Object.keys(zip.files).filter(
                f =>
                    f.includes(imageFolder) &&
                    !f.endsWith('/') &&
                    /\.(jpg|jpeg|png|bmp|webp)$/i.test(f)
            );

            console.log(`找到 ${imageFiles.length} 个图片文件`);

            // 3. 处理每个图片及其XML标注
            let annotationId = 1;

            for (const imagePath of imageFiles) {
                try {
                    const imageName = imagePath.split('/').pop();
                    const baseName = imageName.replace(/\.[^/.]+$/, '');

                    // 获取图片数据
                    const imageData = await zip.file(imagePath).async('blob');
                    const imageUrl = URL.createObjectURL(imageData);

                    // 查找对应的XML文件
                    const xmlPath = `Annotations/${baseName}.xml`;
                    const xmlFile = zip.file(xmlPath);

                    let dimensions = { width: 0, height: 0 };
                    const annotations = [];

                    if (xmlFile) {
                        const xmlContent = await xmlFile.async('string');
                        const xmlData = this.parseXML(xmlContent);

                        // 从XML获取图片尺寸
                        dimensions = {
                            width: xmlData.width || 0,
                            height: xmlData.height || 0,
                        };

                        // 解析标注对象
                        for (const obj of xmlData.objects) {
                            // 查找或创建类别
                            let categoryId = result.categories.findIndex(c => c.name === obj.name);
                            if (categoryId === -1) {
                                categoryId = result.categories.length;
                                result.categories.push({
                                    id: categoryId,
                                    name: obj.name,
                                    color: this.generateCategoryColor(categoryId),
                                });
                            }

                            const category = result.categories[categoryId];
                            annotations.push({
                                id: annotationId++,
                                categoryId: categoryId,
                                x: obj.xmin,
                                y: obj.ymin,
                                width: obj.xmax - obj.xmin,
                                height: obj.ymax - obj.ymin,
                                title: `${category.name} #${String(annotationId).padStart(4, '0')}`,
                                createTime: new Date().toLocaleString(),
                            });
                        }
                    } else {
                        // 如果没有XML文件，尝试获取图片实际尺寸
                        dimensions = await this.getImageDimensions(imageUrl);
                    }

                    // 创建文件对象
                    const fileId = result.files.length + 1;
                    const fileObj = {
                        id: fileId,
                        name: imageName,
                        url: imageUrl,
                        width: dimensions.width,
                        height: dimensions.height,
                        size: `${dimensions.width}×${dimensions.height}`,
                        fileSize: this.formatFileSize(imageData.size),
                        uploadTime: new Date().toLocaleString(),
                    };

                    result.files.push(fileObj);
                    result.annotations[fileId] = annotations;
                } catch (error) {
                    console.error(`处理图片 ${imagePath} 失败:`, error);
                    result.errors.push(`图片 ${imagePath}: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('解析PASCAL VOC格式失败:', error);
            throw error;
        }

        return result;
    }

    /**
     * 解析YAML文件中的类别信息
     * @param {string} yamlContent - YAML内容
     * @returns {Array} 类别数组
     */
    static parseYAMLCategories(yamlContent) {
        const categories = [];
        const lines = yamlContent.split('\n');

        let inNamesSection = false;
        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('names:')) {
                inNamesSection = true;
                continue;
            }

            if (inNamesSection) {
                // 检查是否还在names部分
                if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-')) {
                    // 如果遇到其他键，退出names部分
                    if (trimmedLine.includes(':') && !trimmedLine.match(/^\s*\d+:/)) {
                        break;
                    }
                }

                // 解析格式: "  0: name" 或 "  - name"
                const match =
                    trimmedLine.match(/^\s*(\d+):\s*(.+)$/) || trimmedLine.match(/^\s*-\s*(.+)$/);

                if (match) {
                    const name = match[2] || match[1];
                    categories.push({
                        id: categories.length,
                        name: name.trim(),
                        color: this.generateCategoryColor(categories.length),
                    });
                }
            }
        }

        return categories;
    }

    /**
     * 解析classes.txt文件
     * @param {string} content - 文件内容
     * @returns {Array} 类别数组
     */
    static parseClassesTxt(content) {
        const lines = content.split('\n').filter(line => line.trim());
        return lines.map((name, index) => ({
            id: index,
            name: name.trim(),
            color: this.generateCategoryColor(index),
        }));
    }

    /**
     * 解析YOLO格式的标注
     * @param {string} content - 标注内容
     * @param {number} imageWidth - 图片宽度
     * @param {number} imageHeight - 图片高度
     * @param {Array} categories - 类别列表
     * @returns {Array} 标注数组
     */
    static parseYOLOAnnotations(content, imageWidth, imageHeight, categories) {
        const annotations = [];
        const lines = content.split('\n').filter(line => line.trim());

        let annotationId = 1;
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
                const classId = parseInt(parts[0]);
                const centerX = parseFloat(parts[1]);
                const centerY = parseFloat(parts[2]);
                const width = parseFloat(parts[3]);
                const height = parseFloat(parts[4]);

                // 检查是否为归一化坐标
                const isNormalized = centerX <= 1 && centerY <= 1 && width <= 1 && height <= 1;

                let x, y, w, h;
                if (isNormalized) {
                    // 从归一化坐标转换为像素坐标
                    w = width * imageWidth;
                    h = height * imageHeight;
                    x = centerX * imageWidth - w / 2;
                    y = centerY * imageHeight - h / 2;
                } else {
                    // 绝对坐标
                    w = width;
                    h = height;
                    x = centerX - w / 2;
                    y = centerY - h / 2;
                }

                const category = categories[classId] || { name: '未知类别' };

                annotations.push({
                    id: annotationId++,
                    categoryId: classId,
                    x: Math.round(Math.max(0, x)),
                    y: Math.round(Math.max(0, y)),
                    width: Math.round(Math.max(1, w)),
                    height: Math.round(Math.max(1, h)),
                    title: `${category.name} #${String(annotationId).padStart(4, '0')}`,
                    createTime: new Date().toLocaleString(),
                });
            }
        }

        return annotations;
    }

    /**
     * 解析XML内容
     * @param {string} xmlContent - XML内容
     * @returns {Object} 解析后的数据
     */
    static parseXML(xmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        const result = {
            filename: '',
            width: 0,
            height: 0,
            objects: [],
        };

        // 获取文件名
        const filenameNode = xmlDoc.querySelector('filename');
        if (filenameNode) {
            result.filename = filenameNode.textContent;
        }

        // 获取图片尺寸
        const sizeNode = xmlDoc.querySelector('size');
        if (sizeNode) {
            const widthNode = sizeNode.querySelector('width');
            const heightNode = sizeNode.querySelector('height');
            if (widthNode) result.width = parseInt(widthNode.textContent);
            if (heightNode) result.height = parseInt(heightNode.textContent);
        }

        // 解析所有对象
        const objectNodes = xmlDoc.querySelectorAll('object');
        for (const objNode of objectNodes) {
            const nameNode = objNode.querySelector('name');
            const bndboxNode = objNode.querySelector('bndbox');

            if (nameNode && bndboxNode) {
                const xminNode = bndboxNode.querySelector('xmin');
                const yminNode = bndboxNode.querySelector('ymin');
                const xmaxNode = bndboxNode.querySelector('xmax');
                const ymaxNode = bndboxNode.querySelector('ymax');

                if (xminNode && yminNode && xmaxNode && ymaxNode) {
                    result.objects.push({
                        name: nameNode.textContent,
                        xmin: parseInt(xminNode.textContent),
                        ymin: parseInt(yminNode.textContent),
                        xmax: parseInt(xmaxNode.textContent),
                        ymax: parseInt(ymaxNode.textContent),
                    });
                }
            }
        }

        return result;
    }

    /**
     * 获取图片尺寸
     * @param {string} url - 图片URL
     * @returns {Promise<Object>} 尺寸信息
     */
    static getImageDimensions(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });
            };
            img.onerror = () => {
                reject(new Error('无法加载图片'));
            };
            img.src = url;
        });
    }

    /**
     * 生成类别颜色
     * @param {number} index - 类别索引
     * @returns {string} 颜色值
     */
    static generateCategoryColor(index) {
        const colors = [
            '#e70f0fff',
            '#00FFCC',
            '#3366FF',
            '#66FF66',
            '#FFFF33',
            '#CC66FF',
            '#FF6600',
            '#FF99CC',
            '#00CCFF',
            '#99FF33',
            '#FF0099',
            '#33FFFF',
            '#9933FF',
            '#FFCC00',
            '#00FF99',
            '#ff01847f',
            '#3399FF',
            '#CCFF33',
            '#FF9900',
            '#6633FF',
        ];

        return colors[index % colors.length];
    }

    /**
     * 验证导入的数据
     * @param {Object} data - 导入的数据
     * @returns {Object} 验证结果
     */
    static validateImportedData(data) {
        const errors = [];

        if (!data.files || !Array.isArray(data.files)) {
            errors.push('文件数据格式错误');
        } else if (data.files.length === 0) {
            errors.push('没有找到有效的图片文件');
        }

        if (!data.categories || !Array.isArray(data.categories)) {
            errors.push('类别数据格式错误');
        }

        if (!data.annotations || typeof data.annotations !== 'object') {
            errors.push('标注数据格式错误');
        }

        data.files.forEach(file => {
            if (!file.id || !file.name || !file.url) {
                errors.push(`文件 ${file.name || '未知'} 数据不完整`);
            }
        });

        const categoryIds = new Set(data.categories.map(c => c.id));
        Object.values(data.annotations).forEach(fileAnnotations => {
            fileAnnotations.forEach(ann => {
                if (!categoryIds.has(ann.categoryId)) {
                    console.warn(`标注的类别ID ${ann.categoryId} 不存在于类别列表中`);
                }
            });
        });

        return {
            isValid: errors.length === 0,
            errors: errors,
        };
    }

    /**
     * 计算导入统计信息
     * @param {Object} data - 导入的数据
     * @returns {Object} 统计信息
     */
    static calculateImportStats(data) {
        const stats = {
            totalFiles: data.files.length,
            totalAnnotations: 0,
            totalCategories: data.categories.length,
            filesWithAnnotations: 0,
            emptyFiles: 0,
            categoryCounts: {},
            averageAnnotationsPerImage: 0,
            errors: data.errors ? data.errors.length : 0,
        };

        // 初始化类别计数
        data.categories.forEach(cat => {
            stats.categoryCounts[cat.name] = 0;
        });

        // 统计标注信息
        Object.entries(data.annotations).forEach(([fileId, annotations]) => {
            if (annotations && annotations.length > 0) {
                stats.filesWithAnnotations++;
                stats.totalAnnotations += annotations.length;

                // 统计各类别数量
                annotations.forEach(ann => {
                    const category = data.categories.find(c => c.id === ann.categoryId);
                    if (category && stats.categoryCounts[category.name] !== undefined) {
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

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 合并导入选项
     * @param {Object} existingData - 现有数据
     * @param {Object} importedData - 导入的数据
     * @param {string} mergeStrategy - 合并策略
     * @returns {Object} 合并后的数据
     */
    static mergeImportedData(existingData, importedData, mergeStrategy = 'append') {
        const result = {
            files: [],
            categories: [],
            annotations: {},
            mergeInfo: {
                newFiles: 0,
                newAnnotations: 0,
                newCategories: 0,
                duplicateFiles: 0,
                mergedCategories: 0,
            },
        };

        switch (mergeStrategy) {
            case 'replace':
                // 完全替换现有数据
                return importedData;

            case 'append':
                // 追加新数据
                result.files = [...existingData.files];
                result.categories = [...existingData.categories];
                result.annotations = { ...existingData.annotations };

                // 创建类别名称映射
                const categoryNameMap = {};
                result.categories.forEach(cat => {
                    categoryNameMap[cat.name] = cat.id;
                });

                // 合并类别
                let nextCategoryId = Math.max(...result.categories.map(c => c.id), -1) + 1;
                const importedCategoryIdMap = {};

                importedData.categories.forEach(importedCat => {
                    if (categoryNameMap.hasOwnProperty(importedCat.name)) {
                        // 类别已存在，记录映射
                        importedCategoryIdMap[importedCat.id] = categoryNameMap[importedCat.name];
                        result.mergeInfo.mergedCategories++;
                    } else {
                        // 新类别
                        const newCat = {
                            ...importedCat,
                            id: nextCategoryId++,
                        };
                        result.categories.push(newCat);
                        importedCategoryIdMap[importedCat.id] = newCat.id;
                        categoryNameMap[newCat.name] = newCat.id;
                        result.mergeInfo.newCategories++;
                    }
                });

                // 合并文件和标注
                let nextFileId = Math.max(...result.files.map(f => f.id), 0) + 1;
                let nextAnnotationId =
                    Math.max(
                        ...Object.values(result.annotations)
                            .flat()
                            .map(a => a.id || 0),
                        0
                    ) + 1;

                // 创建文件名映射以检测重复
                const existingFileNames = new Set(result.files.map(f => f.name));

                importedData.files.forEach(importedFile => {
                    if (existingFileNames.has(importedFile.name)) {
                        // 文件名重复
                        result.mergeInfo.duplicateFiles++;
                        console.warn(`文件 ${importedFile.name} 已存在，跳过`);
                    } else {
                        // 添加新文件
                        const originalFileId = importedFile.id;
                        const newFileId = nextFileId++;

                        const newFile = {
                            ...importedFile,
                            id: newFileId,
                        };

                        result.files.push(newFile);
                        result.mergeInfo.newFiles++;

                        // 添加对应的标注，更新类别ID
                        const fileAnnotations = importedData.annotations[originalFileId] || [];
                        result.annotations[newFileId] = fileAnnotations.map(ann => ({
                            ...ann,
                            id: nextAnnotationId++,
                            categoryId: importedCategoryIdMap[ann.categoryId] || ann.categoryId,
                        }));

                        result.mergeInfo.newAnnotations += result.annotations[newFileId].length;
                    }
                });

                break;

            case 'merge':
                // 智能合并（处理同名文件的标注合并）
                // TODO: 实现更复杂的合并逻辑
                return this.mergeImportedData(existingData, importedData, 'append');

            default:
                throw new Error(`不支持的合并策略: ${mergeStrategy}`);
        }

        return result;
    }
}
