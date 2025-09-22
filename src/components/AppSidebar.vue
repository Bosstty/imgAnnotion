<!-- components/AppSidebar.vue - 支持ZIP导入的动态缩略图数量版本 -->
<template>
    <div>
        <div class="sidebar-collapsed" :class="{ expanded: !isCollapsed }" @click="toggleSidebar">
            <div class="collapsed-content" ref="collapsedContent">
                <div class="collapsed-icon">📁</div>
                <div class="collapsed-files" ref="collapsedFiles">
                    <button
                        v-if="totalPages > 1"
                        class="page-nav-btn page-up"
                        @click.stop="previousPage"
                        :disabled="currentPage === 0"
                        title="上一页"
                    >
                        ▲
                    </button>

                    <div class="files-container" ref="filesContainer">
                        <transition-group
                            :name="`page-slide-${slideDirection}`"
                            tag="div"
                            class="files-grid"
                        >
                            <div
                                v-for="file in paginatedFiles"
                                :key="`${file.id}-${currentPage}`"
                                class="collapsed-file-item"
                                :class="{
                                    active: file.id === activeFileId,
                                    'imported-with-annotations':
                                        file.imported && hasAnnotations(file.id),
                                }"
                                @click.stop="selectFileFromCollapsedPanel(file.id)"
                            >
                                <div class="collapsed-file-thumb">
                                    <img :src="file.url" :alt="file.name" />

                                    <div
                                        v-if="hasAnnotations(file.id)"
                                        class="annotation-count-badge"
                                    >
                                        {{ getAnnotationCount(file.id) }}
                                    </div>
                                    <div
                                        v-if="file.imported"
                                        class="imported-badge"
                                        title="从数据包导入"
                                    >
                                        📦
                                    </div>
                                </div>
                            </div>
                        </transition-group>

                        <button
                            v-if="totalPages > 1"
                            class="page-nav-btn page-down"
                            @click.stop="nextPage"
                            :disabled="currentPage === totalPages - 1"
                            title="下一页"
                        >
                            ▼
                        </button>

                        <div v-if="totalPages > 1" class="page-indicator">
                            {{ currentPage + 1 }}/{{ totalPages }}
                        </div>
                    </div>
                </div>

                <!-- 统计信息 -->
                <div class="collapsed-stats">
                    <div class="stat-item">{{ files.length }}</div>
                </div>
            </div>
        </div>

        <!-- 展开状态的完整面板 -->
        <div class="sidebar-expanded" :class="{ open: !isCollapsed }">
            <!-- 面板头部 -->
            <div class="panel-header">
                <h3 class="panel-title">文件管理</h3>
                <button class="close-btn" @click="toggleSidebar">✕</button>
            </div>

            <!-- 上传区域 -->
            <div class="upload-section">
                <div
                    class="upload-area"
                    @click="triggerFileInput"
                    @dragover.prevent="handleDragOver"
                    @dragleave.prevent="handleDragLeave"
                    @drop.prevent="handleDrop"
                    :class="{ 'drag-over': isDragOver }"
                >
                    <div class="upload-icon">📁</div>
                    <div class="upload-content">
                        <div class="upload-text">拖拽图片到此处</div>
                        <div class="upload-hint">支持 JPG、PNG、JPEG 格式图片</div>
                        <div class="upload-hint-zip">或拖拽ZIP数据包进行导入</div>
                    </div>
                    <input
                        ref="fileInput"
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,.zip"
                        style="display: none"
                        @change="handleFileInput"
                    />
                </div>

                <!-- 上传进度 -->
                <div v-if="uploadProgress.length > 0" class="upload-progress">
                    <div
                        v-for="progress in uploadProgress"
                        :key="progress.name"
                        class="progress-item"
                    >
                        <div class="progress-name">{{ progress.name }}</div>
                        <div class="progress-bar">
                            <div
                                class="progress-fill"
                                :style="{ width: progress.percent + '%' }"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- 导入进度 -->
                <div v-if="importProgress.show" class="import-progress">
                    <div class="import-status">
                        <div class="import-icon">📦</div>
                        <div class="import-text">{{ importProgress.text }}</div>
                    </div>
                    <div class="progress-bar">
                        <div
                            class="progress-fill"
                            :style="{ width: importProgress.percent + '%' }"
                        ></div>
                    </div>
                </div>
            </div>

            <!-- 文件列表 -->
            <div class="file-list">
                <div v-if="files.length === 0" class="empty-state">
                    <div class="empty-icon">📷</div>
                    <div class="empty-text">还没有上传图片</div>
                    <div class="empty-hint">支持单张图片上传或ZIP数据包导入</div>
                </div>

                <div
                    v-for="file in files"
                    :key="file.id"
                    :data-file-id="file.id"
                    class="file-item"
                    :class="{
                        active: file.id === activeFileId,
                        'has-annotations': hasAnnotations(file.id),
                        imported: file.imported,
                        'imported-with-annotations': file.imported && hasAnnotations(file.id),
                    }"
                    @click="selectFileFromDetailPanel(file.id)"
                >
                    <div class="file-thumbnail">
                        <img :src="file.url" :alt="file.name" />
                        <div v-if="hasAnnotations(file.id)" class="annotation-count-badge">
                            {{ getAnnotationCount(file.id) }}
                        </div>
                        <div v-if="file.imported" class="imported-badge" title="从数据包导入">
                            📦
                        </div>
                    </div>
                    <div class="file-details">
                        <div class="file-name" :title="file.name">{{ file.name }}</div>
                        <div class="file-info">
                            {{ file.size }} • {{ file.fileSize }}
                            <span v-if="hasAnnotations(file.id)" class="annotation-info">
                                • {{ getAnnotationCount(file.id) }} 个标注
                            </span>
                            <span v-if="file.imported" class="imported-info">• 已导入</span>
                        </div>
                    </div>
                    <button class="file-delete" @click.stop="deleteFile(file.id)" title="删除文件">
                        ✕
                    </button>
                </div>
            </div>

            <div class="panel-footer">
                <button class="action-btn" @click="clearAllFiles" :disabled="files.length === 0">
                    清空所有文件
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import { ImportUtils } from '@/utils/importUtils';

export default {
    name: 'AppSidebar',
    props: {
        files: {
            type: Array,
            required: true,
        },
        activeFileId: {
            type: [Number, String],
            default: null,
        },
        isCollapsed: {
            type: Boolean,
            default: true,
        },
        annotations: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            isDragOver: false,
            uploadProgress: [],
            importProgress: {
                show: false,
                text: '正在解析数据包...',
                percent: 0,
            },
            currentPage: 0,
            filesPerPage: 17,
            slideDirection: 'down',
            resizeObserver: null,
            LAYOUT_CONSTANTS: {
                COLLAPSED_ICON_HEIGHT: 40,
                PAGE_NAV_BUTTON_HEIGHT: 24,
                PAGE_INDICATOR_HEIGHT: 20,
                FILE_ITEM_HEIGHT: 36,
                FILE_ITEM_GAP: 6,
                STATS_HEIGHT: 32,
                PADDING_VERTICAL: 40,
                CONTAINER_MARGIN: 20,
                MIN_FILES_PER_PAGE: 3,
                MAX_FILES_PER_PAGE: 35,
            },
        };
    },
    computed: {
        totalAnnotationsCount() {
            return this.annotations.length;
        },

        totalPages() {
            return Math.ceil(this.files.length / this.filesPerPage);
        },

        paginatedFiles() {
            const start = this.currentPage * this.filesPerPage;
            const end = start + this.filesPerPage;
            return this.files.slice(start, end);
        },
    },
    watch: {
        activeFileId: {
            handler(newFileId) {
                if (newFileId !== null) {
                    this.syncToActiveFile(newFileId);
                }
            },
            immediate: true,
        },

        files: {
            handler() {
                this.$nextTick(() => {
                    this.calculateFilesPerPage();
                    this.adjustCurrentPageAfterFilesChange();
                });
            },
            deep: true,
        },
    },
    mounted() {
        this.$nextTick(() => {
            this.calculateFilesPerPage();
            this.setupResizeObserver();
        });

        window.addEventListener('resize', this.handleWindowResize);
    },
    beforeDestroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        window.removeEventListener('resize', this.handleWindowResize);
    },
    methods: {
        /**
         * 动态计算每页可显示的文件数量
         */
        calculateFilesPerPage() {
            if (!this.$refs.collapsedContent) {
                return;
            }

            try {
                const containerHeight = this.$refs.collapsedContent.clientHeight;

                // 计算固定元素占用的高度
                const fixedElementsHeight =
                    this.LAYOUT_CONSTANTS.COLLAPSED_ICON_HEIGHT +
                    this.LAYOUT_CONSTANTS.STATS_HEIGHT +
                    this.LAYOUT_CONSTANTS.PADDING_VERTICAL +
                    this.LAYOUT_CONSTANTS.CONTAINER_MARGIN;

                // 计算分页控件的高度（仅在有多页时显示）
                const paginationHeight =
                    this.files.length > this.LAYOUT_CONSTANTS.MIN_FILES_PER_PAGE
                        ? this.LAYOUT_CONSTANTS.PAGE_NAV_BUTTON_HEIGHT * 2 +
                          this.LAYOUT_CONSTANTS.PAGE_INDICATOR_HEIGHT +
                          this.LAYOUT_CONSTANTS.FILE_ITEM_GAP * 3
                        : 0;

                // 计算可用于显示文件的高度
                const availableHeight = containerHeight - fixedElementsHeight - paginationHeight;

                // 计算每个文件项的总高度（包括间距）
                const itemTotalHeight =
                    this.LAYOUT_CONSTANTS.FILE_ITEM_HEIGHT + this.LAYOUT_CONSTANTS.FILE_ITEM_GAP;

                // 计算可显示的文件数量
                let calculatedFilesPerPage = Math.floor(availableHeight / itemTotalHeight);

                // 应用最小和最大限制
                calculatedFilesPerPage = Math.max(
                    this.LAYOUT_CONSTANTS.MIN_FILES_PER_PAGE,
                    Math.min(this.LAYOUT_CONSTANTS.MAX_FILES_PER_PAGE, calculatedFilesPerPage)
                );

                // 如果计算结果与当前值不同，则更新
                if (calculatedFilesPerPage !== this.filesPerPage) {
                    const oldFilesPerPage = this.filesPerPage;
                    this.filesPerPage = calculatedFilesPerPage;

                    // 调整当前页码，确保活动文件仍然可见
                    this.adjustCurrentPageAfterResize(oldFilesPerPage);

                    console.log(
                        `动态调整缩略图数量: ${oldFilesPerPage} -> ${calculatedFilesPerPage}, 容器高度: ${containerHeight}px`
                    );
                }
            } catch (error) {
                console.warn('计算每页文件数量时出错:', error);
                // 出错时使用默认值
                this.filesPerPage = this.LAYOUT_CONSTANTS.MIN_FILES_PER_PAGE * 3;
            }
        },

        /**
         * 调整当前页码（在resize后保持活动文件可见）
         */
        adjustCurrentPageAfterResize(oldFilesPerPage) {
            if (!this.activeFileId || !this.files.length) return;

            // 找到活动文件的索引
            const activeFileIndex = this.files.findIndex(file => file.id === this.activeFileId);
            if (activeFileIndex === -1) return;

            // 计算活动文件应该在哪一页
            const targetPage = Math.floor(activeFileIndex / this.filesPerPage);

            // 如果目标页与当前页不同，则切换过去
            if (targetPage !== this.currentPage) {
                this.slideDirection = targetPage > this.currentPage ? 'down' : 'up';
                this.currentPage = Math.max(0, Math.min(targetPage, this.totalPages - 1));
            }
        },

        /**
         * 文件列表变化后调整页码
         */
        adjustCurrentPageAfterFilesChange() {
            // 如果当前页超出了范围，调整到最后一页
            if (this.currentPage >= this.totalPages && this.totalPages > 0) {
                this.currentPage = this.totalPages - 1;
            }

            // 如果有活动文件，确保它在当前页可见
            if (this.activeFileId) {
                this.syncToActiveFile(this.activeFileId);
            }
        },

        /**
         * 设置ResizeObserver监听容器大小变化
         */
        setupResizeObserver() {
            if (!window.ResizeObserver || !this.$refs.collapsedContent) return;

            this.resizeObserver = new ResizeObserver(entries => {
                // 使用requestAnimationFrame确保DOM更新完成后再计算
                requestAnimationFrame(() => {
                    this.calculateFilesPerPage();
                });
            });

            this.resizeObserver.observe(this.$refs.collapsedContent);
        },

        /**
         * 处理窗口大小变化
         */
        handleWindowResize() {
            // 防抖处理，避免频繁计算
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.calculateFilesPerPage();
            }, 150);
        },

        toggleSidebar() {
            this.$emit('toggle-sidebar');

            // 无论展开还是折叠，都需要重新计算缩略图数量
            this.$nextTick(() => {
                this.calculateFilesPerPage();
            });
        },

        selectFile(fileId) {
            this.$emit('file-selected', fileId);
            this.syncToActiveFile(fileId);
        },

        selectFileFromCollapsedPanel(fileId) {
            this.selectFile(fileId);
        },

        selectFileFromDetailPanel(fileId) {
            this.selectFile(fileId);
        },

        syncToActiveFile(fileId) {
            if (!fileId || !this.files.length) return;

            const fileIndex = this.files.findIndex(file => file.id === fileId);
            if (fileIndex === -1) return;

            const targetPage = Math.floor(fileIndex / this.filesPerPage);

            if (this.currentPage !== targetPage) {
                this.slideDirection = targetPage > this.currentPage ? 'down' : 'up';
                this.currentPage = targetPage;
            }

            this.$nextTick(() => {
                this.scrollToFileInDetailPanel(fileId);
            });
        },

        // 在详细面板中滚动到指定文件
        scrollToFileInDetailPanel(fileId) {
            if (this.isCollapsed) return; // 如果面板是折叠状态，不需要滚动

            const fileListElement = this.$el.querySelector('.file-list');
            const targetFileElement = this.$el.querySelector(
                `.file-item[data-file-id="${fileId}"]`
            );

            if (fileListElement && targetFileElement) {
                const containerTop = fileListElement.scrollTop;
                const containerHeight = fileListElement.clientHeight;
                const elementTop = targetFileElement.offsetTop;
                const elementHeight = targetFileElement.clientHeight;

                // 计算是否需要滚动
                const elementBottom = elementTop + elementHeight;
                const containerBottom = containerTop + containerHeight;

                if (elementTop < containerTop || elementBottom > containerBottom) {
                    // 滚动到元素位置，留一些边距
                    const scrollTop = elementTop - (containerHeight - elementHeight) / 2;
                    fileListElement.scrollTo({
                        top: Math.max(0, scrollTop),
                        behavior: 'smooth',
                    });
                }
            }
        },

        // 修改的分页方法
        nextPage() {
            if (this.currentPage < this.totalPages - 1) {
                this.slideDirection = 'down';
                this.currentPage++;
                this.ensureActiveFileInCurrentPage();
            }
        },

        previousPage() {
            if (this.currentPage > 0) {
                this.slideDirection = 'up';
                this.currentPage--;
                // 如果当前页没有活动文件，选择第一个文件
                this.ensureActiveFileInCurrentPage();
            }
        },

        // 确保当前页有活动文件
        ensureActiveFileInCurrentPage() {
            const currentPageFiles = this.paginatedFiles;

            // 检查当前活动文件是否在当前页
            const activeFileInCurrentPage = currentPageFiles.find(
                file => file.id === this.activeFileId
            );

            // 如果当前页没有活动文件，选择当前页的第一个文件
            if (!activeFileInCurrentPage && currentPageFiles.length > 0) {
                this.selectFile(currentPageFiles[0].id);
            }
        },

        // 跳转到指定页码
        goToPage(pageNumber) {
            if (pageNumber >= 0 && pageNumber < this.totalPages) {
                this.slideDirection = pageNumber > this.currentPage ? 'down' : 'up';
                this.currentPage = pageNumber;
                this.ensureActiveFileInCurrentPage();
            }
        },

        // 根据文件ID获取其所在页码
        getPageByFileId(fileId) {
            const fileIndex = this.files.findIndex(file => file.id === fileId);
            return fileIndex >= 0 ? Math.floor(fileIndex / this.filesPerPage) : 0;
        },

        resetPagination() {
            this.currentPage = 0;
            if (this.activeFileId) {
                this.$nextTick(() => {
                    this.syncToActiveFile(this.activeFileId);
                });
            }
        },

        hasAnnotations(fileId) {
            return this.annotations.some(annotation => annotation.fileId === fileId);
        },

        getAnnotationCount(fileId) {
            return this.annotations.filter(annotation => annotation.fileId === fileId).length;
        },

        deleteFile(fileId) {
            if (confirm('确定要删除这个文件吗？删除后标注数据也会丢失。')) {
                this.$emit('file-deleted', fileId);
                this.$emit('message', { type: 'success', message: '文件删除成功' });
            }
        },

        clearAllFiles() {
            if (confirm('确定要清空所有文件吗？所有标注数据都会丢失。')) {
                this.$emit('files-cleared');
                this.$emit('message', { type: 'success', message: '已清空所有文件' });
            }
        },

        triggerFileInput() {
            this.$refs.fileInput.click();
        },

        handleFileInput(event) {
            const files = Array.from(event.target.files);
            this.processFiles(files);
            event.target.value = '';
        },

        handleDragOver(event) {
            event.preventDefault();
            this.isDragOver = true;
        },

        handleDragLeave(event) {
            event.preventDefault();
            this.isDragOver = false;
        },

        handleDrop(event) {
            event.preventDefault();
            this.isDragOver = false;
            const files = Array.from(event.dataTransfer.files);
            this.processFiles(files);
        },

        async processFiles(files) {
            if (files.length === 0) return;

            // 检查是否有ZIP文件
            const zipFiles = files.filter(file => file.name.toLowerCase().endsWith('.zip'));
            const imageFiles = files.filter(file => file.type.startsWith('image/'));

            if (zipFiles.length > 0) {
                // 处理ZIP文件导入
                await this.processZipImport(zipFiles);
            }

            if (imageFiles.length > 0) {
                // 处理图片文件上传
                await this.processImageUpload(imageFiles);
            }

            if (zipFiles.length === 0 && imageFiles.length === 0) {
                this.$emit('message', {
                    type: 'warning',
                    message: '请选择图片文件（JPG、PNG、JPEG格式）或ZIP数据包',
                });
            }
        },

        /**
         * 处理ZIP文件导入
         */
        async processZipImport(zipFiles) {
            for (const zipFile of zipFiles) {
                try {
                    this.showImportProgress(`正在解析 ${zipFile.name}...`, 10);
                    const importResult = await ImportUtils.importZip(zipFile, {
                        mergeStrategy: 'append',
                    });
                    this.updateImportProgress('正在处理数据...', 50);

                    if (importResult.success) {
                        await this.handleImportSuccess(importResult, zipFile.name);
                    } else {
                        throw new Error(importResult.message || '导入失败');
                    }

                    this.updateImportProgress('导入完成', 100);
                    setTimeout(() => {
                        this.hideImportProgress();
                    }, 1000);
                } catch (error) {
                    this.hideImportProgress();
                    console.error('ZIP导入失败:', error);
                    this.$emit('message', {
                        type: 'error',
                        message: `导入 ${zipFile.name} 失败: ${error.message}`,
                    });
                }
            }
        },

        /**
         * 处理导入成功的数据
         */
        async handleImportSuccess(importResult, zipFileName) {
            const { data, format, stats } = importResult;
            this.updateImportProgress('正在合并数据...', 80);
            // 发送导入数据给父组件
            this.$emit('data-imported', {
                files: data.files,
                categories: data.categories,
                annotations: data.annotations,
                format: format,
                stats: stats,
                zipFileName: zipFileName,
                errors: data.errors || [],
            });

            // 显示导入结果
            let message = `成功导入 ${format} 格式数据: ${stats.totalFiles} 个文件`;
            if (stats.totalAnnotations > 0) {
                message += `，${stats.totalAnnotations} 个标注`;
            }
            if (stats.totalCategories > 0) {
                message += `，${stats.totalCategories} 个类别`;
            }

            this.$emit('message', {
                type: 'success',
                message: message,
            });

            // 如果有错误，也要提示
            if (data.errors && data.errors.length > 0) {
                setTimeout(() => {
                    this.$emit('message', {
                        type: 'warning',
                        message: `导入过程中遇到 ${data.errors.length} 个问题，请检查数据完整性`,
                    });
                }, 2000);
            }
        },

        /**
         * 处理图片文件上传
         */
        async processImageUpload(imageFiles) {
            this.uploadProgress = imageFiles.map(file => ({
                name: file.name,
                percent: 0,
            }));

            const processedFiles = [];

            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const progress = this.uploadProgress[i];

                try {
                    progress.percent = 10;
                    const imageData = await this.loadImageData(file);
                    progress.percent = 80;
                    const url = URL.createObjectURL(file);
                    progress.percent = 100;

                    processedFiles.push({
                        name: file.name,
                        file: file,
                        url: url,
                        width: imageData.width,
                        height: imageData.height,
                        fileSize: this.formatFileSize(file.size),
                        imported: false,
                    });
                } catch (error) {
                    console.error('处理文件失败:', file.name, error);
                    this.$emit('message', {
                        type: 'error',
                        message: `处理文件 "${file.name}" 时出错`,
                    });
                }
            }

            if (processedFiles.length > 0) {
                this.$emit('files-uploaded', processedFiles);
            }

            setTimeout(() => {
                this.uploadProgress = [];
            }, 1000);
        },

        /**
         * 显示导入进度
         */
        showImportProgress(text, percent = 0) {
            this.importProgress = {
                show: true,
                text: text,
                percent: percent,
            };
        },

        /**
         * 更新导入进度
         */
        updateImportProgress(text, percent) {
            this.importProgress.text = text;
            this.importProgress.percent = percent;
        },

        /**
         * 隐藏导入进度
         */
        hideImportProgress() {
            this.importProgress.show = false;
        },

        loadImageData(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                    });
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        },

        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
    },
};
</script>

<style scoped>
.sidebar-collapsed {
    position: fixed;
    top: 60px;
    left: 0;
    width: 60px;
    height: calc(100vh - 60px);
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;
}

.collapsed-content {
    padding: 20px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    position: relative;
}

/* 折叠状态图标 */
.collapsed-icon {
    font-size: 20px;
    margin-bottom: 10px;
    color: #64748b;
}

/* 折叠状态文件列表 */
.collapsed-files {
    flex: 1;
    width: 109%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    padding: 0 4px;
    margin-bottom: 20px;
}

/* 文件容器 -   */
.files-container {
    flex: 1;
    width: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    gap: 6px;
}

.files-grid {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    width: 100%;
    position: relative;
    flex: 1;
}

/* 页面切换动画 - 修复溢出问题 */
.page-slide-up-enter-active,
.page-slide-up-leave-active,
.page-slide-down-enter-active,
.page-slide-down-leave-active {
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-slide-up-enter-from,
.page-slide-up-leave-to,
.page-slide-down-enter-from,
.page-slide-down-leave-to {
    opacity: 0;
}

.page-slide-up-enter-to,
.page-slide-up-leave-from,
.page-slide-down-enter-to,
.page-slide-down-leave-from {
    opacity: 1;
}

/* 关键修复：隐藏动画过程中超出的文件项 */
.page-slide-up-leave-active,
.page-slide-down-leave-active {
    position: absolute;
    width: 100%;
}

/* 分页导航按钮 */
.page-nav-btn {
    width: 40px;
    height: 24px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #64748b;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.page-nav-btn:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #334155;
    transform: translateY(-1px);
}

.page-nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    color: #cbd5e1;
}

.page-nav-btn.page-up {
    margin-bottom: 4px;
}

.files-container .page-nav-btn.page-down {
    margin-top: 4px;
    margin-bottom: 0;
    overflow: hidden;
}

.collapsed-file-item {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
    flex-shrink: 0;
}

.collapsed-file-item.active {
    border-color: #3b82f6;
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.collapsed-file-item.imported-with-annotations {
    /* border-color: #bbf7d0; */
    background: #f0fdf4;
    transform: scale(1.02);
}

.collapsed-file-item.imported-with-annotations.active {
    border-color: #3b82f6;
    background: #f0f9ff;
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.collapsed-file-thumb {
    width: 100%;
    height: 100%;
    position: relative;
    border-radius: 5px;
    border: 1px solid #b4b8be;
    background: #ffffff;
}

.collapsed-file-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 3px;
}

.files-container .page-indicator {
    font-size: 10px;
    color: #64748b;
    text-align: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 2px 6px;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 4px;
}

/* 标注数量徽章 -  */
.annotation-count-badge {
    position: absolute;
    top: -3px;
    right: -2px;
    min-width: 14px;
    height: 14px;
    background: #22c55e;
    color: white;
    border-radius: 7px;
    font-size: 9px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    border: 1px solid white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    z-index: 10;
}

/* 统计信息 */
.collapsed-stats {
    margin-top: auto;
}

.stat-item {
    width: 32px;
    height: 32px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
}

/* 展开状态的面板 */
.sidebar-expanded {
    position: fixed;
    top: 60px;
    left: -350px;
    width: 350px;
    height: calc(100vh - 60px);
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    box-shadow: 8px 0 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    z-index: 1001;
    overflow: hidden;
}

.sidebar-expanded.open {
    left: 60px;
}

/* 面板头部 */
.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

.panel-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #1e293b;
}

.close-btn {
    width: 32px;
    height: 32px;
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.close-btn:hover {
    background: #f1f5f9;
    color: #334155;
}

/* 上传区域 */
.upload-section {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
}

.upload-area {
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    background: #f8fafc;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 80px;
}

.upload-area:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
}

.upload-area.drag-over {
    border-color: #22c55e;
    background: #f0fdf4;
}

.upload-icon {
    font-size: 24px;
    color: #64748b;
    margin-bottom: 8px;
}

.upload-text {
    font-size: 14px;
    font-weight: 500;
    color: #334155;
    margin-bottom: 4px;
}

.upload-hint {
    font-size: 12px;
    color: #64748b;
}

.upload-hint-zip {
    font-size: 12px;
    color: #059669;
    margin-top: 2px;
    font-weight: 500;
}

.upload-progress {
    margin-top: 15px;
}

.progress-item {
    margin-bottom: 8px;
}

.progress-name {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.progress-bar {
    height: 4px;
    background: #e2e8f0;
    border-radius: 2px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #22c55e;
    transition: width 0.3s ease;
}

/* 导入进度 */
.import-progress {
    margin-top: 15px;
    padding: 12px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 6px;
}

.import-status {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
}

.import-icon {
    font-size: 16px;
    margin-right: 8px;
    color: #0369a1;
}

.import-text {
    font-size: 13px;
    color: #0369a1;
    font-weight: 500;
}

/* 文件列表 */
.file-list {
    flex: 1;
    overflow-y: auto;
    padding: 15px 20px;
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #64748b;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.5;
}

.empty-text {
    font-size: 14px;
    margin-bottom: 8px;
}

.empty-hint {
    font-size: 12px;
    color: #94a3b8;
}

.file-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin: 8px 0;
    background: #ffffff;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid #e2e8f0;
    position: relative;
}

.file-item:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.file-item.active {
    background: #f0f9ff;
    border-color: #3b82f6;
    color: #1e40af;
}

.file-item.has-annotations {
    background: #f0fdf4;
    border-color: #bbf7d0;
}

.file-item.has-annotations.active {
    background: #f0f9ff;
    border-color: #3b82f6;
}

.file-item.imported {
    background: #fef3c7;
    border-color: #fbbf24;
}

.file-item.imported.active {
    background: #f0f9ff;
    border-color: #3b82f6;
}

.file-item.imported-with-annotations {
    background: #f0fdf4 !important;
    border-color: #bbf7d0 !important;
}

.file-item.imported-with-annotations.active {
    background: #f0f9ff !important;
    border-color: #3b82f6 !important;
}

.file-thumbnail {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    margin-right: 12px;
    position: relative;
    flex-shrink: 0;
}

.file-thumbnail img {
    width: 100%;
    height: 100%;
    border: 1px solid #b4b8be;
    border-radius: 15%;
    object-fit: cover;
}

.imported-badge {
    position: absolute;
    top: -4px;
    left: -4px;
    font-size: 10px;
    background: #fbbf24;
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.file-details {
    flex: 1;
    min-width: 0;
}

.file-name {
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #1e293b;
}

.file-item.active .file-name {
    color: #1e40af;
}

.file-info {
    font-size: 12px;
    color: #64748b;
}

.annotation-info {
    color: #059669;
    font-weight: 500;
}

.imported-info {
    color: #d97706;
    font-weight: 500;
}

.file-delete {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    opacity: 0;
}

.file-item:hover .file-delete {
    opacity: 1;
}

.file-delete:hover {
    background: #fee2e2;
    color: #dc2626;
}

/* 面板底部 */
.panel-footer {
    padding: 20px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
}

.action-btn {
    width: 100%;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 13px;
}

.action-btn:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #334155;
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 滚动条 */
.collapsed-files::-webkit-scrollbar,
.file-list::-webkit-scrollbar {
    width: 4px;
}

.collapsed-files::-webkit-scrollbar-track,
.file-list::-webkit-scrollbar-track {
    background: #f1f5f9;
}

.collapsed-files::-webkit-scrollbar-thumb,
.file-list::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
}

/* 当页数过多时的优化显示 */
@media (max-width: 768px) {
    .sidebar-collapsed {
        width: 50px;
    }

    .sidebar-expanded {
        width: calc(100% - 50px);
        left: -100%;
    }

    .sidebar-expanded.open {
        left: 50px;
    }

    .collapsed-file-item {
        width: 35px;
        height: 35px;
    }

    .page-quick-nav {
        max-height: 60px;
        overflow-y: auto;
    }
}
</style>
