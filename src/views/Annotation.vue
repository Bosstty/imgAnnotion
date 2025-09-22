<template>
    <div id="app" class="port-annotation-app">
        <AppHeader @message="handleMessage" />

        <!-- 主工作区域 - -->
        <div
            class="main-workspace"
            :class="{
                'sidebar-open': !sidebarCollapsed,
                'properties-open': !propertiesPanelCollapsed,
            }"
        >
            <MainArea
                ref="mainArea"
                :activeFile="activeFile"
                :zoom="zoom"
                :activeTool="activeTool"
                :categories="categories"
                :selectedCategoryId="selectedCategoryId"
                :annotations="currentAnnotations"
                :selectedAnnotationId="selectedAnnotationId"
                :allFiles="files"
                :currentFileIndex="currentFileIndex"
                :totalFiles="files.length"
                :annotationCount="currentAnnotations.length"
                :totalAnnotations="totalAnnotationsCount"
                :allAnnotations="allAnnotations"
                @file-changed="handleFileChanged"
                @tool-changed="handleToolChanged"
                @zoom-changed="handleZoomChanged"
                @annotation-added="handleAnnotationAdded"
                @annotation-updated="handleAnnotationUpdated"
                @annotation-deleted="handleAnnotationDeleted"
                @annotation-selected="handleAnnotationSelected"
                @image-resized="handleImageResized"
                @message="handleMessage"
            />
        </div>

        <!-- 左侧折叠面板 -->
        <AppSidebar
            :files="files"
            :active-file-id="activeFileId"
            :is-collapsed="sidebarCollapsed"
            :annotations="allAnnotations"
            @file-selected="handleFileSelected"
            @file-deleted="handleFileDeleted"
            @files-cleared="handleFilesCleared"
            @files-uploaded="handleFilesUploaded"
            @data-imported="handleDataImported"
            @toggle-sidebar="toggleSidebar"
            @message="handleMessage"
        />

        <!-- 右侧折叠属性面板 -->
        <PropertiesPanel
            :is-collapsed="propertiesPanelCollapsed"
            :categories="categories"
            :annotations="currentAnnotations"
            :selectedAnnotationId="selectedAnnotationId"
            :selectedCategoryId="selectedCategoryId"
            :allFiles="files"
            :allAnnotations="allAnnotations"
            @toggle-panel="togglePropertiesPanel"
            @export="handleExport"
            @category-added="handleCategoryAdded"
            @category-selected="handleCategorySelected"
            @category-deleted="handleCategoryDeleted"
            @annotation-selected="handleAnnotationSelected"
            @annotation-deleted="handleAnnotationDeleted"
            @message="handleMessage"
        />

        <div
            v-if="showOverlay"
            class="overlay"
            @click="closeAllPanels"
            :class="{ 'overlay-visible': showOverlay }"
        ></div>

        <div v-if="showMessage" class="message-container" :class="`message-${messageType}`">
            <span class="message-text">{{ messageText }}</span>
            <button class="message-close" @click="closeMessage">&times;</button>
        </div>

        <div v-if="loading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">{{ loadingText }}</div>
        </div>

        <div v-if="showShortcutHint" class="shortcut-hint">
            <div class="hint-content">
                <div class="hint-title">快捷键提示</div>
                <div class="hint-list">
                    <div class="hint-item">
                        <kbd>Ctrl</kbd>
                        +
                        <kbd>1</kbd>
                        切换左侧面板
                    </div>
                    <div class="hint-item">
                        <kbd>Ctrl</kbd>
                        +
                        <kbd>2</kbd>
                        切换右侧面板
                    </div>
                    <div class="hint-item">
                        <kbd>Esc</kbd>
                        关闭所有面板
                    </div>
                    <div class="hint-item">
                        <kbd>←</kbd>
                        <kbd>→</kbd>
                        翻页
                    </div>
                </div>
            </div>
            <button class="hint-close" @click="showShortcutHint = false">✕</button>
        </div>

        <el-dialog
            :visible.sync="showImportDialog"
            title="数据导入确认"
            :width="$_isMobile ? '95%' : '500px'"
            :close-on-click-modal="false"
            :close-on-press-escape="true"
            :append-to-body="true"
            custom-class="import-dialog-custom"
            @close="cancelImport"
        >
            <div class="import-dialog-content">
                <!-- 导入摘要 -->
                <div class="import-summary-section">
                    <div class="section-title">即将导入以下数据：</div>
                    <div class="summary-stats-card">
                        <div class="stat-row">
                            <span class="stat-label">文件数量：</span>
                            <span class="stat-value">
                                {{ pendingImport?.stats?.totalFiles || 0 }} 个
                            </span>
                        </div>
                        <div class="stat-row" v-if="duplicateFilesCount > 0">
                            <span class="stat-label">重复文件：</span>
                            <span class="stat-value" style="color: #d97706">
                                {{ duplicateFilesCount }} 个（将合并标注）
                            </span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">标注数量：</span>
                            <span class="stat-value">
                                {{ pendingImport?.stats?.totalAnnotations || 0 }} 个
                            </span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">类别数量：</span>
                            <span class="stat-value">
                                {{ pendingImport?.stats?.totalCategories || 0 }} 个
                            </span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">数据格式：</span>
                            <span class="stat-value">
                                {{ pendingImport?.format || '未知' }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 导入选项 -->
                <div class="import-options-section">
                    <div class="section-title">导入选项：</div>
                    <el-radio-group v-model="importStrategy" class="import-radio-group">
                        <el-radio label="replace" class="import-radio-item">
                            <div class="radio-content">
                                <strong>替换全部</strong>
                                <span class="radio-desc">清空现有数据，导入新数据</span>
                            </div>
                        </el-radio>
                        <el-radio label="append" class="import-radio-item">
                            <div class="radio-content">
                                <strong>追加合并</strong>
                                <span class="radio-desc">
                                    保留现有数据，追加新数据（重复文件将合并标注）
                                </span>
                            </div>
                        </el-radio>
                    </el-radio-group>
                </div>

                <!-- 重复文件提示 -->
                <el-alert
                    v-if="duplicateFilesCount > 0 && importStrategy === 'append'"
                    type="info"
                    :closable="false"
                    show-icon
                    class="import-info-alert"
                >
                    <template slot="title">
                        <div class="info-content">
                            <div class="info-title">文件合并提示</div>
                            <div class="info-text">
                                检测到
                                {{ duplicateFilesCount }}
                                个重复文件，将保留原文件并合并标注数据（自动去重）。
                            </div>
                            <div class="duplicate-files-list" v-if="duplicateFileNames.length > 0">
                                <div
                                    class="duplicate-file-item"
                                    v-for="(fileName, index) in duplicateFileNames.slice(0, 5)"
                                    :key="index"
                                >
                                    • {{ fileName }}
                                </div>
                                <div v-if="duplicateFileNames.length > 5" class="duplicate-more">
                                    还有 {{ duplicateFileNames.length - 5 }} 个重复文件...
                                </div>
                            </div>
                        </div>
                    </template>
                </el-alert>

                <!-- 警告信息 -->
                <el-alert
                    v-if="pendingImport?.errors?.length > 0"
                    type="warning"
                    :closable="false"
                    show-icon
                    class="import-warnings-alert"
                >
                    <template slot="title">
                        <div class="warning-content">
                            <div class="warning-title">导入警告</div>
                            <div class="warning-list">
                                <div
                                    v-for="(error, index) in pendingImport.errors.slice(0, 3)"
                                    :key="index"
                                    class="warning-item"
                                >
                                    • {{ error }}
                                </div>
                                <div v-if="pendingImport.errors.length > 3" class="warning-more">
                                    还有 {{ pendingImport.errors.length - 3 }} 个警告...
                                </div>
                            </div>
                        </div>
                    </template>
                </el-alert>
            </div>

            <!-- 底部按钮 -->
            <span slot="footer" class="dialog-footer">
                <el-button @click="cancelImport">取消</el-button>
                <el-button type="primary" @click="confirmImport">确认导入</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
import AppHeader from '../components/AppHeader.vue';
import AppSidebar from '../components/AppSidebar.vue';
import MainArea from '../components/MainArea.vue';
import PropertiesPanel from '../components/PropertiesPanel.vue';
import { ExportUtils } from '../utils/exportUtils.js';

export default {
    name: 'App',
    components: {
        AppHeader,
        AppSidebar,
        MainArea,
        PropertiesPanel,
    },
    data() {
        return {
            sidebarCollapsed: true,
            propertiesPanelCollapsed: true,

            showMessage: false,
            messageText: '',
            messageType: 'info',
            messageTimer: null,

            loading: false,
            loadingText: '',

            showShortcutHint: true,

            files: [],
            activeFileId: null,
            nextFileId: 1,

            zoom: 100,
            activeTool: 'rectangle',

            categories: [
                { id: 0, name: 'test_01', color: '#e70f0fff' },
                { id: 1, name: 'rust', color: '#00FFCC' },
                { id: 2, name: 'LooseScrews', color: '#3366FF' },
                { id: 3, name: 'Facilities', color: '#66FF66' },
                { id: 4, name: 'GoodsLeakage', color: '#FFFF33' },
            ],
            selectedCategoryId: 0,
            nextCategoryId: 5,
            annotationsData: {},
            selectedAnnotationId: null,
            nextAnnotationId: 1,
            showImportDialog: false,
            pendingImport: null,
            importStrategy: 'append',
            duplicateFilesCount: 0,
            duplicateFileNames: [],
        };
    },
    computed: {
        activeFile() {
            return this.files.find(file => file.id === this.activeFileId);
        },

        currentAnnotations() {
            return this.annotationsData[this.activeFileId] || [];
        },

        allAnnotations() {
            const allAnnotations = [];
            Object.keys(this.annotationsData).forEach(fileId => {
                const annotations = this.annotationsData[fileId] || [];
                annotations.forEach(annotation => {
                    allAnnotations.push({
                        ...annotation,
                        fileId: parseInt(fileId),
                    });
                });
            });
            return allAnnotations;
        },

        showOverlay() {
            return (
                !this.sidebarCollapsed || !this.propertiesPanelCollapsed || this.showImportDialog
            );
        },
        currentFileIndex() {
            if (!this.activeFileId || !this.files.length) return 0;
            const index = this.files.findIndex(file => file.id === this.activeFileId);
            return index >= 0 ? index : 0;
        },

        totalAnnotationsCount() {
            return Object.values(this.annotationsData).reduce(
                (total, annotations) => total + (annotations?.length || 0),
                0
            );
        },
        $_isMobile() {
            return window.innerWidth <= 768;
        },
    },
    created() {
        this.$nextTick(() => {
            // 5秒后隐藏快捷键提示
            setTimeout(() => {
                this.showShortcutHint = false;
            }, 5000);
        });
    },
    mounted() {
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        document.addEventListener('keydown', this.handleGlobalKeyDown);
    },
    beforeDestroy() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        document.removeEventListener('keydown', this.handleGlobalKeyDown);
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
        }
    },
    methods: {
        handleMessage(messageObj) {
            this.showSystemMessage(messageObj.message, messageObj.type);
        },

        showSystemMessage(text, type = 'info', duration = 3000) {
            this.$message({
                message: text,
                type: type,
                duration: duration,
            });
        },

        showLoading(text = '正在处理...') {
            this.loadingText = text;
            this.loading = true;
        },

        hideLoading() {
            this.loading = false;
        },

        handleBeforeUnload(event) {
            const hasAnnotations = Object.values(this.annotationsData).some(
                annotations => annotations && annotations.length > 0
            );
            const hasFiles = this.files && this.files.length > 0;

            if (hasAnnotations || hasFiles) {
                const message = '您有未保存的标注数据，离开页面将会丢失所有数据。确定要离开吗？';
                event.preventDefault();
                event.returnValue = message;
                return message;
            }
        },

        handleGlobalKeyDown(event) {
            // Ctrl+S 保存提醒
            if (event.ctrlKey && event.key === 's') {
                event.preventDefault();
                this.showSystemMessage('请使用导出功能保存标注数据', 'info');
            }

            if (event.ctrlKey && event.key === '1') {
                event.preventDefault();
                this.toggleSidebar();
            }
            if (event.ctrlKey && event.key === '2') {
                event.preventDefault();
                this.togglePropertiesPanel();
            }

            if (event.key === 'Escape') {
                if (this.showImportDialog) {
                    this.cancelImport();
                } else {
                    this.closeAllPanels();
                }
            }
        },

        // 面板控制 - 互斥逻辑
        toggleSidebar() {
            const wasCollapsed = this.sidebarCollapsed;

            // 如果要展开左侧面板，先关闭右侧面板
            if (wasCollapsed && !this.propertiesPanelCollapsed) {
                this.propertiesPanelCollapsed = true;
            }

            this.sidebarCollapsed = !this.sidebarCollapsed;
        },

        togglePropertiesPanel() {
            const wasCollapsed = this.propertiesPanelCollapsed;

            if (wasCollapsed && !this.sidebarCollapsed) {
                this.sidebarCollapsed = true;
            }

            this.propertiesPanelCollapsed = !this.propertiesPanelCollapsed;
        },

        // 关闭所有面板
        closeAllPanels() {
            let closedPanels = [];

            if (!this.sidebarCollapsed) {
                this.sidebarCollapsed = true;
                closedPanels.push('左侧面板');
            }

            if (!this.propertiesPanelCollapsed) {
                this.propertiesPanelCollapsed = true;
                closedPanels.push('右侧面板');
            }
        },

        handleImageResized(resizeInfo) {
            console.log('图片尺寸变化', resizeInfo);
        },

        // 文件管理
        handleFileSelected(fileId) {
            this.handleFileChanged(fileId);
        },

        handleFileChanged(fileId) {
            const oldFileId = this.activeFileId;
            this.activeFileId = fileId;
            this.selectedAnnotationId = null;

            // 通知所有相关组件文件已切换
            this.$nextTick(() => {
                if (this.$refs.mainArea) {
                    this.$refs.mainArea.resetInteraction && this.$refs.mainArea.resetInteraction();
                }
            });
        },

        handleFilesUploaded(newFiles) {
            if (!Array.isArray(newFiles) || newFiles.length === 0) {
                this.showSystemMessage('没有有效的文件上传', 'warning');
                return;
            }

            let successCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            const skippedFiles = [];

            newFiles.forEach(fileData => {
                try {
                    const existingFile = this.files.find(file => file.name === fileData.name);

                    if (existingFile) {
                        skippedCount++;
                        skippedFiles.push(fileData.name);
                        console.log(`文件 "${fileData.name}" 已存在，跳过上传`);
                        return;
                    }

                    const fileId = this.nextFileId++;
                    const newFile = {
                        id: fileId,
                        name: fileData.name,
                        url: fileData.url,
                        width: fileData.width,
                        height: fileData.height,
                        size: `${fileData.width}×${fileData.height}`,
                        fileSize:
                            fileData.fileSize || this.formatFileSize(fileData.file?.size || 0),
                        uploadTime: new Date().toLocaleString(),
                        imported: fileData.imported || false, // 标记是否为导入文件
                    };

                    this.files.push(newFile);
                    this.$set(this.annotationsData, fileId, []);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    console.error('处理文件失败:', fileData.name, error);
                    this.showSystemMessage(`文件 "${fileData.name}" 处理失败`, 'error');
                }
            });

            if (!this.activeFileId && this.files.length > 0) {
                this.handleFileChanged(this.files[0].id);
            }

            this.showUploadResult(successCount, skippedCount, errorCount, skippedFiles);
        },

        /**
         * 处理数据导入
         */
        handleDataImported(importData) {
            console.log('接收到导入数据:', importData);

            // 检查重复文件
            this.checkDuplicateFiles(importData);

            // 暂存导入数据，显示确认对话框
            this.pendingImport = importData;
            this.showImportDialog = true;
        },

        /**
         * 检查重复文件
         */
        checkDuplicateFiles(importData) {
            if (this.importStrategy === 'replace') {
                this.duplicateFilesCount = 0;
                this.duplicateFileNames = [];
                return;
            }

            const duplicates = [];
            importData.files.forEach(importFile => {
                const existingFile = this.files.find(file => file.name === importFile.name);
                if (existingFile) {
                    duplicates.push(importFile.name);
                }
            });

            this.duplicateFilesCount = duplicates.length;
            this.duplicateFileNames = duplicates;
        },

        /**
         * 取消导入
         */
        cancelImport() {
            this.showImportDialog = false;
            this.pendingImport = null;
            this.importStrategy = 'append';
            this.duplicateFilesCount = 0;
            this.duplicateFileNames = [];
        },

        /**
         * 确认导入
         */
        async confirmImport() {
            if (!this.pendingImport) return;

            try {
                this.showLoading('正在导入数据...');

                // 根据导入策略处理数据
                if (this.importStrategy === 'replace') {
                    await this.replaceAllData(this.pendingImport);
                } else {
                    await this.appendImportData(this.pendingImport);
                }

                this.showImportDialog = false;
                this.pendingImport = null;
                this.importStrategy = 'append';
                this.duplicateFilesCount = 0;
                this.duplicateFileNames = [];

                this.hideLoading();
            } catch (error) {
                this.hideLoading();
                console.error('导入失败:', error);
                this.showSystemMessage('导入失败: ' + error.message, 'error');
            }
        },

        /**
         * 替换全部数据
         */
        async replaceAllData(importData) {
            // 清空现有数据
            this.clearAllExistingData();

            // 导入新数据
            await this.importNewData(importData, true);

            this.showSystemMessage(
                `已替换全部数据: ${importData.stats.totalFiles} 个文件，${importData.stats.totalAnnotations} 个标注`,
                'success'
            );
        },

        /**
         * 追加导入数据
         */
        async appendImportData(importData) {
            const mergeResult = await this.importNewData(importData, false);

            let message = `已追加导入: ${mergeResult.newFiles} 个新文件，${mergeResult.totalAnnotations} 个标注`;
            if (mergeResult.mergedFiles > 0) {
                message += `，合并了 ${mergeResult.mergedFiles} 个重复文件的标注`;
            }
            if (mergeResult.duplicateAnnotations > 0) {
                message += `（去重 ${mergeResult.duplicateAnnotations} 个重复标注）`;
            }

            this.showSystemMessage(message, 'success');
        },

        /**
         * 清空现有数据
         */
        clearAllExistingData() {
            // 释放图片URL
            this.files.forEach(file => {
                if (file.url && file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url);
                }
            });

            this.files = [];
            this.annotationsData = {};
            this.categories = [];
            this.activeFileId = null;
            this.selectedAnnotationId = null;
            this.nextFileId = 1;
            this.nextCategoryId = 0;
            this.nextAnnotationId = 1;
        },

        /**
         * 导入新数据
         */
        async importNewData(importData, isReplace) {
            const { files, categories, annotations, stats } = importData;

            const categoryIdMap = this.importCategories(categories, isReplace);

            const { fileIdMap, mergeInfo } = await this.importFiles(files, isReplace);

            const annotationStats = await this.importAnnotations(
                annotations,
                fileIdMap,
                categoryIdMap,
                isReplace
            );

            if (this.files.length > 0 && !this.activeFileId) {
                this.handleFileChanged(this.files[0].id);
            }

            return {
                newFiles: mergeInfo.newFiles,
                mergedFiles: mergeInfo.mergedFiles,
                totalAnnotations: annotationStats.totalImported,
                duplicateAnnotations: annotationStats.duplicatesRemoved,
            };
        },

        /**
         * 导入类别
         */
        importCategories(importedCategories, isReplace) {
            const categoryIdMap = {};

            if (isReplace) {
                // 替换模式：直接使用导入的类别
                this.categories = importedCategories.map((cat, index) => ({
                    ...cat,
                    id: index,
                }));

                // 建立ID映射
                importedCategories.forEach((cat, index) => {
                    categoryIdMap[cat.id] = index;
                });

                this.nextCategoryId = this.categories.length;
            } else {
                // 追加模式：合并类别
                importedCategories.forEach(importedCat => {
                    const existingCat = this.categories.find(cat => cat.name === importedCat.name);
                    if (existingCat) {
                        categoryIdMap[importedCat.id] = existingCat.id;
                    } else {
                        const newCategoryId = this.nextCategoryId++;
                        const newCategory = {
                            ...importedCat,
                            id: newCategoryId,
                        };

                        this.categories.push(newCategory);
                        categoryIdMap[importedCat.id] = newCategoryId;
                    }
                });
            }

            return categoryIdMap;
        },

        /**
         * 导入文件（支持合并重复文件）
         */
        async importFiles(importedFiles, isReplace) {
            const fileIdMap = {};
            let newFilesCount = 0;
            let mergedFilesCount = 0;

            for (const importedFile of importedFiles) {
                // 检查是否存在同名文件
                const existingFile = this.files.find(file => file.name === importedFile.name);

                if (existingFile && !isReplace) {
                    // 如果文件已存在且不是替换模式，使用现有文件的ID
                    fileIdMap[importedFile.id] = existingFile.id;
                    mergedFilesCount++;
                    console.log(`文件 "${importedFile.name}" 已存在，将合并标注数据`);
                } else {
                    // 创建新文件
                    const newFileId = this.nextFileId++;
                    const newFile = {
                        ...importedFile,
                        id: newFileId,
                        imported: true,
                        uploadTime: new Date().toLocaleString(),
                    };
                    this.files.push(newFile);

                    // 初始化空的标注数组
                    if (!this.annotationsData[newFileId]) {
                        this.$set(this.annotationsData, newFileId, []);
                    }

                    fileIdMap[importedFile.id] = newFileId;
                    newFilesCount++;
                }
            }

            return {
                fileIdMap,
                mergeInfo: {
                    newFiles: newFilesCount,
                    mergedFiles: mergedFilesCount,
                },
            };
        },

        /**
         * 导入标注（支持去重）
         */
        async importAnnotations(importedAnnotations, fileIdMap, categoryIdMap, isReplace) {
            let totalImported = 0;
            let duplicatesRemoved = 0;

            Object.entries(importedAnnotations).forEach(([originalFileId, fileAnnotations]) => {
                const newFileId = fileIdMap[originalFileId];

                if (newFileId && Array.isArray(fileAnnotations)) {
                    // 获取现有的标注（如果有）
                    const existingAnnotations = this.annotationsData[newFileId] || [];

                    // 创建新的标注数组
                    const newAnnotations = fileAnnotations.map(ann => {
                        const newAnnotationId = this.nextAnnotationId++;
                        const mappedCategoryId =
                            categoryIdMap[ann.categoryId] !== undefined
                                ? categoryIdMap[ann.categoryId]
                                : ann.categoryId;
                        // 获取类别信息
                        const category = this.categories.find(c => c.id === mappedCategoryId);

                        return {
                            ...ann,
                            id: newAnnotationId,
                            categoryId: mappedCategoryId,
                            title: `${category?.name || '未知类别'} #${newAnnotationId
                                .toString()
                                .padStart(4, '0')}`,
                            createTime: ann.createTime || new Date().toLocaleString(),
                        };
                    });

                    // 如果是追加模式且文件已存在，需要合并并去重
                    if (!isReplace && existingAnnotations.length > 0) {
                        const mergedAnnotations = this.mergeAnnotations(
                            existingAnnotations,
                            newAnnotations
                        );
                        duplicatesRemoved +=
                            existingAnnotations.length +
                            newAnnotations.length -
                            mergedAnnotations.length;
                        this.annotationsData[newFileId] = mergedAnnotations;
                        totalImported += newAnnotations.length;
                    } else {
                        // 替换模式或新文件，直接使用新标注
                        this.annotationsData[newFileId] = newAnnotations;
                        totalImported += newAnnotations.length;
                    }
                }
            });

            return {
                totalImported,
                duplicatesRemoved,
            };
        },

        /**
         * 合并标注并去重
         * 判断重复的标准：位置和大小完全相同，且类别相同
         */
        mergeAnnotations(existingAnnotations, newAnnotations) {
            const merged = [...existingAnnotations];

            newAnnotations.forEach(newAnn => {
                // 检查是否已存在相同的标注
                const isDuplicate = merged.some(existingAnn =>
                    this.isAnnotationDuplicate(existingAnn, newAnn)
                );

                if (!isDuplicate) {
                    merged.push(newAnn);
                } else {
                    console.log(`发现重复标注，已自动去重: ${newAnn.title}`);
                }
            });

            return merged;
        },

        /**
         * 判断两个标注是否重复
         * 判断标准：位置、大小、类别都相同
         */
        isAnnotationDuplicate(ann1, ann2) {
            return (
                ann1.x === ann2.x &&
                ann1.y === ann2.y &&
                ann1.width === ann2.width &&
                ann1.height === ann2.height &&
                ann1.categoryId === ann2.categoryId
            );
        },

        showUploadResult(successCount, skippedCount, errorCount, skippedFiles) {
            const totalAttempted = successCount + skippedCount + errorCount;

            if (totalAttempted === 0) {
                return;
            }

            let messages = [];

            if (successCount > 0) {
                messages.push(`成功上传 ${successCount} 个文件`);
            }

            if (skippedCount > 0) {
                if (skippedCount <= 3) {
                    const fileNames = skippedFiles.slice(0, 3).join('、');
                    messages.push(`跳过重复文件: ${fileNames}`);
                } else {
                    messages.push(`跳过 ${skippedCount} 个重复文件`);
                }
            }

            if (errorCount > 0) {
                messages.push(`${errorCount} 个文件处理失败`);
            }

            let messageType = 'info';
            let messageText = messages.join('，');

            if (errorCount > 0) {
                messageType = 'warning';
            } else if (successCount > 0) {
                messageType = 'success';
            } else if (skippedCount > 0) {
                messageType = 'warning';
                messageText = `所有文件都已存在，${messageText}`;
            }

            this.showSystemMessage(messageText, messageType);
        },

        handleFileDeleted(fileId) {
            const file = this.files.find(f => f.id === fileId);
            if (!file) return;

            const deletedAnnotations = this.annotationsData[fileId]?.length || 0;

            this.files = this.files.filter(f => f.id !== fileId);

            if (this.annotationsData[fileId]) {
                this.$delete(this.annotationsData, fileId);
            }

            if (file.url && file.url.startsWith('blob:')) {
                URL.revokeObjectURL(file.url);
            }

            if (this.activeFileId === fileId) {
                this.selectedAnnotationId = null;
                if (this.files.length > 0) {
                    const deletedIndex = this.files.findIndex(f => f.id === fileId);
                    let nextFileId = null;

                    if (deletedIndex >= 0) {
                        if (deletedIndex < this.files.length) {
                            nextFileId = this.files[deletedIndex].id;
                        } else if (deletedIndex > 0) {
                            nextFileId = this.files[deletedIndex - 1].id;
                        } else if (this.files.length > 0) {
                            nextFileId = this.files[0].id;
                        }
                    } else {
                        nextFileId = this.files[0].id;
                    }

                    this.handleFileChanged(nextFileId);
                } else {
                    this.activeFileId = null;
                }
            }

            if (deletedAnnotations > 0) {
                this.showSystemMessage(
                    `已删除 "${file.name}" 及其 ${deletedAnnotations} 个标注`,
                    'success'
                );
            } else {
                this.showSystemMessage(`已删除 "${file.name}"`, 'success');
            }
        },

        handleFilesCleared() {
            const totalAnnotations = Object.values(this.annotationsData).reduce(
                (total, annotations) => total + (annotations?.length || 0),
                0
            );

            this.files.forEach(file => {
                if (file.url && file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url);
                }
            });

            this.files = [];
            this.annotationsData = {};
            this.activeFileId = null;
            this.selectedAnnotationId = null;

            if (totalAnnotations > 0) {
                this.showSystemMessage(`已清空所有文件及其 ${totalAnnotations} 个标注`, 'success');
            } else {
                this.showSystemMessage('已清空所有文件', 'success');
            }
        },

        // 工具状态管理
        handleToolChanged(tool) {
            this.activeTool = tool;
            this.selectedAnnotationId = null;

            const toolNames = {
                select: '选择工具',
                rectangle: '矩形标注',
                move: '移动工具',
            };
        },

        handleZoomChanged(newZoom) {
            this.zoom = Math.max(25, Math.min(400, newZoom));
        },

        // 分类管理
        handleCategorySelected(categoryId) {
            this.selectedCategoryId = categoryId;
            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                this.showSystemMessage(`已选择类别: ${category.name}`, 'info', 2000);
            }
        },

        handleCategoryAdded(category) {
            if (!category || !category.name?.trim()) {
                this.showSystemMessage('类别数据无效', 'error');
                return;
            }

            const newCategory = {
                id: this.nextCategoryId++,
                name: category.name.trim(),
                color: category.color || '#64748b',
                createTime: new Date().toLocaleString(),
            };

            this.categories.push(newCategory);
        },

        handleCategoryDeleted(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            if (!category) return;

            this.categories = this.categories.filter(c => c.id !== categoryId);

            let deletedCount = 0;
            Object.keys(this.annotationsData).forEach(fileId => {
                const originalLength = this.annotationsData[fileId].length;
                this.annotationsData[fileId] = this.annotationsData[fileId].filter(
                    ann => ann.categoryId !== categoryId
                );
                deletedCount += originalLength - this.annotationsData[fileId].length;
            });

            if (this.selectedCategoryId === categoryId && this.categories.length > 0) {
                this.selectedCategoryId = this.categories[0].id;
            }

            this.showSystemMessage(
                `已删除类别 "${category.name}" 及其 ${deletedCount} 个标注`,
                'success'
            );
        },

        handleAnnotationAdded(annotation) {
            console.log('接收到的标注数据:', annotation);
            if (!this.activeFileId || !annotation) {
                this.showSystemMessage('添加标注失败：无效的文件或标注数据', 'error');
                return;
            }

            try {
                const category = this.categories.find(c => c.id === annotation.categoryId);
                const annotationId = this.nextAnnotationId++;

                const newAnnotation = {
                    id: annotationId,
                    categoryId: annotation.categoryId,
                    x: Math.round(Math.max(0, annotation.x)),
                    y: Math.round(Math.max(0, annotation.y)),
                    width: Math.round(Math.max(1, annotation.width)),
                    height: Math.round(Math.max(1, annotation.height)),
                    title: `${category?.name || '未知类别'} #${annotationId
                        .toString()
                        .padStart(4, '0')}`,
                    createTime: new Date().toLocaleString(),
                };

                if (!this.annotationsData[this.activeFileId]) {
                    this.$set(this.annotationsData, this.activeFileId, []);
                }

                this.annotationsData[this.activeFileId].push(newAnnotation);
                this.selectedAnnotationId = newAnnotation.id;
            } catch (error) {
                console.error('添加标注失败:', error);
                this.showSystemMessage('添加标注失败', 'error');
            }
        },

        handleAnnotationUpdated(annotation) {
            if (!this.activeFileId || !annotation?.id) {
                this.showSystemMessage('更新标注失败：无效的标注数据', 'error');
                return;
            }

            try {
                const annotations = this.annotationsData[this.activeFileId];
                const index = annotations.findIndex(ann => ann.id === annotation.id);

                if (index !== -1) {
                    const updatedAnnotation = {
                        ...annotations[index],
                        x: Math.round(Math.max(0, annotation.x)),
                        y: Math.round(Math.max(0, annotation.y)),
                        width: Math.round(Math.max(1, annotation.width)),
                        height: Math.round(Math.max(1, annotation.height)),
                        updateTime: new Date().toLocaleString(),
                    };

                    this.$set(annotations, index, updatedAnnotation);
                }
            } catch (error) {
                console.error('更新标注失败:', error);
                this.showSystemMessage('更新标注失败', 'error');
            }
        },

        handleAnnotationDeleted(annotationId) {
            if (!this.activeFileId || !annotationId) return;

            try {
                const annotations = this.annotationsData[this.activeFileId];
                this.annotationsData[this.activeFileId] = annotations.filter(
                    ann => ann.id !== annotationId
                );

                if (this.selectedAnnotationId === annotationId) {
                    this.selectedAnnotationId = null;
                }

                const remainingAnnotations = this.annotationsData[this.activeFileId].length;
                this.showSystemMessage(
                    `标注删除成功 (剩余: ${remainingAnnotations} 个)`,
                    'success'
                );
            } catch (error) {
                console.error('删除标注失败:', error);
                this.showSystemMessage('删除标注失败', 'error');
            }
        },

        handleAnnotationSelected(annotationId) {
            this.selectedAnnotationId = annotationId;
        },

        // 数据导出
        async handleExport(exportData) {
            const format = typeof exportData === 'string' ? exportData : exportData.format;
            const options = typeof exportData === 'string' ? {} : exportData.options || {};

            if (this.files.length === 0) {
                this.showSystemMessage('没有可导出的文件', 'warning');
                return;
            }

            const totalAnnotations = Object.values(this.annotationsData).reduce(
                (total, annotations) => total + (annotations?.length || 0),
                0
            );

            if (totalAnnotations === 0 && !options.includeEmpty) {
                this.showSystemMessage(
                    '没有可导出的标注数据，请勾选"包含无标注的图片"选项或先添加标注',
                    'warning'
                );
                return;
            }

            if (totalAnnotations === 0 && options.includeEmpty) {
                this.showSystemMessage('将导出所有图片（无标注数据）', 'info');
            }

            try {
                const exportMessage = options.includeEmpty
                    ? `正在导出 ${this.files.length} 个文件（包含无标注图片）...`
                    : `正在导出 ${totalAnnotations} 个标注...`;

                this.showLoading(exportMessage);

                let result;
                switch (format) {
                    case 'txt':
                        result = await ExportUtils.exportYOLO(
                            this.files,
                            this.annotationsData,
                            this.categories,
                            options
                        );
                        break;
                    case 'json':
                        result = await ExportUtils.exportCOCO(
                            this.files,
                            this.annotationsData,
                            this.categories,
                            options
                        );
                        break;
                    case 'xml':
                        result = await ExportUtils.exportPascalVOC(
                            this.files,
                            this.annotationsData,
                            this.categories,
                            options
                        );
                        break;
                    default:
                        throw new Error(`不支持的导出格式: ${format}`);
                }

                this.hideLoading();

                if (result && result.success) {
                    let successMessage = result.message;
                    if (options.includeEmpty && result.stats) {
                        const emptyFiles =
                            result.stats.files -
                            Math.min(
                                result.stats.files,
                                totalAnnotations > 0 ? Object.keys(this.annotationsData).length : 0
                            );
                        if (emptyFiles > 0) {
                            successMessage += `（包含 ${emptyFiles} 个无标注图片）`;
                        }
                    }

                    this.showSystemMessage(successMessage, 'success');

                    await this.askToOpenTrainingApp(this.getFormatDisplayName(format));
                } else {
                    this.showSystemMessage(result?.message || '导出失败', 'error');
                }
            } catch (error) {
                this.hideLoading();
                console.error('导出失败:', error);
                this.showSystemMessage('导出失败: ' + (error.message || '未知错误'), 'error');
            }
        },

        // 获取格式显示名称
        getFormatDisplayName(format) {
            const formatMap = {
                txt: 'TXT (YOLO)',
                json: 'JSON (COCO)',
                xml: 'XML (PASCAL VOC)',
            };
            return formatMap[format] || format.toUpperCase();
        },

        // 询问是否打开训练程序
        async askToOpenTrainingApp(formatName) {
            try {
                await this.$confirm(
                    `${formatName} 导出完成！是否立即打开训练程序开始模型训练？`,
                    '打开训练程序',
                    {
                        confirmButtonText: '立即打开',
                        cancelButtonText: '稍后手动',
                        type: 'info',
                    }
                );

                // 用户确认后打开训练程序
                this.openTrainingApp();
            } catch (error) {
                // 用户取消，不需要处理
                console.log('用户取消打开训练程序');
            }
        },

        // 打开训练程序
        openTrainingApp() {
            try {
                const protocolUrl = 'Vessel://open';
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = protocolUrl;
                document.body.appendChild(iframe);
                const timeout = setTimeout(() => {
                    this.handleProtocolFallback();
                    document.body.removeChild(iframe);
                }, 2000);

                const handleBlur = () => {
                    clearTimeout(timeout);
                    document.body.removeChild(iframe);
                    window.removeEventListener('blur', handleBlur);
                    this.showSystemMessage('训练程序已启动', 'success');
                };
                window.addEventListener('blur', handleBlur);
                setTimeout(() => {
                    window.removeEventListener('blur', handleBlur);
                }, 2000);
            } catch (error) {
                console.error('打开训练程序失败:', error);
                this.handleProtocolFallback();
            }
        },

        handleProtocolFallback() {
            this.$confirm(
                '无法自动打开训练程序。请手动启动训练应用程序，或者点击下方按钮下载训练程序。',
                '无法打开应用',
                {
                    confirmButtonText: '下载训练程序',
                    cancelButtonText: '我知道了',
                    type: 'warning',
                }
            )
                .then(() => {
                    // 用户选择下载训练程序
                    this.downloadTrainingApp();
                })
                .catch(() => {
                    // 用户取消，不需要处理
                });
        },

        downloadTrainingApp() {
            const downloadUrl = 'https://example.com/training-app-download';
            window.open(downloadUrl, '_blank');
            this.showSystemMessage('正在跳转到下载页面...', 'info');
        },

        getCategoryName(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.name : '未知类别';
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
.port-annotation-app {
    font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
    background: #f8fafc;
    height: 100vh;
    overflow: hidden;
    color: #1e293b;
}

.main-workspace {
    position: fixed;
    top: 60px;
    left: 60px;
    right: 60px;
    bottom: 0;
    background: #f8fafc;
    z-index: 100;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 60px);
}

.overlay {
    position: fixed;
    top: 60px;
    left: 60px;
    right: 60px;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 900;
    opacity: 0;
    backdrop-filter: blur(2px);
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.overlay-visible {
    opacity: 1;
    pointer-events: all;
}

.shortcut-hint {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 41, 59, 0.95);
    backdrop-filter: blur(20px);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 1100;
    max-width: 500px;
    animation: slideInUp 0.4s ease-out;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

@keyframes slideInUp {
    from {
        transform: translate(-50%, 100px);
        opacity: 0;
    }
    to {
        transform: translate(-50%, 0);
        opacity: 1;
    }
}

.hint-content {
    flex: 1;
}

.hint-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #fbbf24;
}

.hint-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.hint-item {
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #cbd5e1;
}

.hint-item kbd {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-family: inherit;
    color: white;
    font-weight: 500;
}

.hint-close {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    cursor: pointer;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    margin-left: 16px;
    transition: all 0.2s ease;
}

.hint-close:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
}

.message-container {
    position: fixed;
    top: 80px;
    right: 80px;
    min-width: 280px;
    max-width: 450px;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: space-between;
    animation: slideInRight 0.3s ease-out;
    border-left: 4px solid;
}

.message-info {
    background: rgba(59, 130, 246, 0.95);
    color: white;
    border-left-color: #3b82f6;
}

.message-success {
    background: rgba(34, 197, 94, 0.95);
    color: white;
    border-left-color: #22c55e;
}

.message-warning {
    background: rgba(245, 158, 11, 0.95);
    color: white;
    border-left-color: #f59e0b;
}

.message-error {
    background: rgba(239, 68, 68, 0.95);
    color: white;
    border-left-color: #ef4444;
}

.message-text {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
}

.message-close {
    background: none;
    border: none;
    color: inherit;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    margin-left: 12px;
    opacity: 0.8;
    transition: opacity 0.2s ease;
}

.message-close:hover {
    opacity: 1;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(5px);
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #22c55e;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
}

.loading-text {
    color: white;
    font-size: 16px;
    font-weight: 500;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Element Dialog 自定义样式 */
::v-deep .import-dialog-custom {
    border-radius: 12px;
    overflow: hidden;
}

::v-deep .import-dialog-custom .el-dialog__header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 20px 24px;
}

::v-deep .import-dialog-custom .el-dialog__title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
}

::v-deep .import-dialog-custom .el-dialog__headerbtn {
    top: 20px;
    right: 20px;
    width: 32px;
    height: 32px;
    font-size: 18px;
}

::v-deep .import-dialog-custom .el-dialog__headerbtn:hover {
    background: #f1f5f9;
    border-radius: 50%;
}

::v-deep .import-dialog-custom .el-dialog__body {
    padding: 0;
}

::v-deep .import-dialog-custom .el-dialog__footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 20px 24px;
}

/* 对话框内容 */
.import-dialog-content {
    padding: 24px;
    max-height: 65vh;
    overflow-y: auto;
}

/* 导入摘要部分 */
.import-summary-section {
    margin-bottom: 24px;
}

.section-title {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 12px;
}

.summary-stats-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
}

.stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
}

.stat-row:not(:last-child) {
    margin-bottom: 4px;
}

.stat-label {
    color: #64748b;
    font-size: 14px;
}

.stat-value {
    color: #1e293b;
    font-weight: 500;
    font-size: 14px;
}

/* 导入选项部分 */
.import-options-section {
    margin-bottom: 24px;
}

.import-radio-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

::v-deep .import-radio-item {
    width: 100%;
    height: auto;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-right: 0;
    transition: all 0.2s ease;
    display: flex;
    align-items: flex-start;
}

::v-deep .import-radio-item:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
}

::v-deep .import-radio-item.is-checked {
    background: #f0f9ff;
    border-color: #3b82f6;
}

::v-deep .import-radio-item .el-radio__input {
    margin-right: 12px;
    margin-top: 2px;
    flex-shrink: 0;
}

::v-deep .import-radio-item .el-radio__label {
    flex: 1;
    white-space: normal;
    padding: 0;
    line-height: 1;
}

.radio-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.radio-content strong {
    font-size: 14px;
    color: #1e293b;
    font-weight: 600;
    line-height: 1.2;
    display: block;
}

.radio-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
    display: block;
    margin-top: 2px;
}

::v-deep .import-radio-item.is-checked .radio-content strong {
    color: #1e40af;
}

/* 文件合并提示 */
::v-deep .import-info-alert {
    background: #f0f9ff;
    border: 1px solid #93c5fd;
    border-radius: 8px;
}

::v-deep .import-info-alert .el-alert__icon {
    color: #2563eb;
}

.info-content {
    width: 100%;
}

.info-title {
    font-size: 14px;
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 8px;
}

.info-text {
    font-size: 13px;
    color: #1e40af;
    line-height: 1.4;
    margin-bottom: 8px;
}

.duplicate-files-list {
    margin-top: 8px;
    padding-left: 4px;
}

.duplicate-file-item {
    font-size: 12px;
    color: #64748b;
    line-height: 1.6;
}

.duplicate-more {
    font-size: 12px;
    color: #94a3b8;
    font-style: italic;
    margin-top: 4px;
}

/* 警告信息 */
::v-deep .import-warnings-alert {
    background: #fffbeb;
    border: 1px solid #fed7aa;
    border-radius: 8px;
}

::v-deep .import-warnings-alert .el-alert__icon {
    color: #d97706;
}

.warning-content {
    width: 100%;
}

.warning-title {
    font-size: 14px;
    font-weight: 600;
    color: #d97706;
    margin-bottom: 8px;
}

.warning-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.warning-item {
    font-size: 13px;
    color: #92400e;
    line-height: 1.4;
}

.warning-more {
    font-size: 13px;
    color: #d97706;
    font-weight: 500;
    margin-top: 4px;
}

/* 按钮样式覆盖 */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

::v-deep .dialog-footer .el-button {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
}

::v-deep .dialog-footer .el-button--default {
    background: white;
    color: #64748b;
    border-color: #cbd5e1;
}

::v-deep .dialog-footer .el-button--default:hover {
    background: #f8fafc;
    color: #334155;
    border-color: #94a3b8;
}

::v-deep .dialog-footer .el-button--primary {
    background: #3b82f6;
    border-color: #3b82f6;
}

::v-deep .dialog-footer .el-button--primary:hover {
    background: #2563eb;
    border-color: #2563eb;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .import-dialog-content {
        padding: 20px;
    }

    .import-radio-group {
        gap: 8px;
    }

    ::v-deep .import-radio-item {
        padding: 10px;
    }

    ::v-deep .import-dialog-custom .el-dialog__header {
        padding: 16px 20px;
    }

    ::v-deep .import-dialog-custom .el-dialog__footer {
        padding: 16px 20px;
    }

    .main-workspace {
        left: 50px;
        right: 50px;
    }

    .main-workspace.sidebar-open {
        left: 0;
        right: 0;
    }

    .main-workspace.properties-open {
        left: 0;
        right: 0;
    }

    .overlay {
        left: 50px;
        right: 50px;
    }

    .message-container {
        right: 60px;
        left: 60px;
        min-width: auto;
    }

    .shortcut-hint {
        left: 20px;
        right: 20px;
        transform: none;
        max-width: none;
        bottom: 80px;
    }

    .hint-list {
        flex-direction: column;
    }

    .import-dialog {
        width: 95%;
        margin: 20px;
    }

    .dialog-content {
        padding: 20px;
    }

    .option-group {
        gap: 8px;
    }

    .option-item {
        padding: 10px;
    }
}

/* 滚动条美化 */
.import-dialog-content::-webkit-scrollbar {
    width: 6px;
}

.import-dialog-content::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
}

.import-dialog-content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.import-dialog-content::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

.message-container {
    z-index: 1200;
}

.loading-overlay {
    z-index: 10000;
}

.shortcut-hint {
    z-index: 1100;
}

.import-dialog-overlay {
    z-index: 10001;
}
</style>
