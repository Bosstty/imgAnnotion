<template>
    <div>
        <!-- 折叠状态的面板边条 -->
        <div class="properties-collapsed" :class="{ expanded: !isCollapsed }" @click="togglePanel">
            <!-- 折叠状态显示的内容 -->
            <div class="collapsed-content">
                <!-- 属性图标指示器 -->
                <div class="collapsed-icon">📋</div>

                <!-- 类别颜色指示器 -  -->
                <div class="collapsed-categories">
                    <div
                        v-for="category in categories"
                        :key="category.id"
                        class="collapsed-category-item"
                        :class="{ active: selectedCategoryId === category.id }"
                        @click.stop="selectCategory(category.id)"
                    >
                        <div
                            class="collapsed-category-dot"
                            :style="{ background: category.color }"
                        ></div>
                        <div class="collapsed-category-name">{{ category.name }}</div>
                    </div>
                </div>

                <!-- 统计信息 -->
                <div class="collapsed-stats">
                    <div class="stat-item">
                        <div class="stat-number">{{ totalAnnotationsCount }}</div>
                        <div class="stat-text">标注</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">{{ annotatedFilesCount }}</div>
                        <div class="stat-text">图片</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 展开状态的完整面板 -->
        <div class="properties-expanded" :class="{ open: !isCollapsed }">
            <!-- 面板头部 -->
            <div class="panel-header">
                <h3 class="panel-title">标注管理</h3>
                <button class="close-btn" @click="togglePanel">✕</button>
            </div>

            <div class="panel-content">
                <!-- 检测目标类别 -->
                <div class="categories-section">
                    <div class="section-title">检测目标类别</div>
                    <div
                        v-for="category in categories"
                        :key="category.id"
                        class="category-item"
                        :class="{ selected: selectedCategoryId === category.id }"
                        @click="selectCategory(category.id)"
                    >
                        <div class="category-info">
                            <div
                                class="category-color"
                                :style="{ background: category.color }"
                            ></div>
                            <span class="category-name">{{ category.name }}</span>
                        </div>
                        <div class="category-actions">
                            <span class="category-count">{{ getCategoryCount(category.id) }}</span>
                            <button
                                class="category-delete"
                                @click.stop="deleteCategory(category.id)"
                                :disabled="getCategoryCount(category.id) > 0"
                                title="删除类别"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <!-- 添加新类别 -->
                    <div v-if="showAddCategory" class="add-category-form">
                        <div class="input-group">
                            <input
                                ref="categoryInput"
                                v-model="newCategoryName"
                                type="text"
                                placeholder="输入类别名称 (仅限英文字母、数字、下划线)"
                                class="category-input"
                                :class="{ 'input-error': inputError }"
                                @keyup.enter="addCategory"
                                @keyup.esc="cancelAddCategory"
                                @input="validateCategoryName"
                                @keydown="restrictInput"
                            />
                        </div>
                        <div class="color-picker">
                            <div
                                v-for="color in presetColors"
                                :key="color"
                                class="color-option"
                                :class="{
                                    selected: newCategoryColor === color,
                                    used: isColorUsed(color),
                                }"
                                :style="{ background: color }"
                                @click="selectColor(color)"
                                :title="isColorUsed(color) ? '该颜色已被使用' : ''"
                            ></div>
                        </div>
                        <div class="form-actions">
                            <button
                                class="btn-confirm"
                                @click="addCategory"
                                :disabled="!newCategoryName.trim() || isColorUsed(newCategoryColor)"
                            >
                                确定
                            </button>
                            <button class="btn-cancel" @click="cancelAddCategory">取消</button>
                        </div>
                    </div>

                    <button v-else class="add-category-btn" @click="startAddCategory">
                        + 添加新类别
                    </button>
                </div>

                <!-- 当前标注列表 -->
                <div class="annotations-section">
                    <div class="section-title">
                        当前标注列表 ({{ annotations.length }})
                        <button
                            v-if="annotations.length > 0"
                            class="clear-all-btn"
                            @click="clearAllAnnotations"
                            title="清空所有标注"
                        >
                            清空
                        </button>
                    </div>
                    <div class="annotation-list">
                        <div v-if="annotations.length === 0" class="empty-annotations">
                            暂无标注数据
                        </div>

                        <div
                            v-for="annotation in annotations"
                            :key="annotation.id"
                            class="annotation-item"
                            :class="{ selected: selectedAnnotationId === annotation.id }"
                            @click="selectAnnotation(annotation.id)"
                        >
                            <div class="annotation-header">
                                <div class="annotation-title">{{ annotation.title }}</div>
                                <button
                                    class="annotation-delete"
                                    @click.stop="deleteAnnotation(annotation.id)"
                                    title="删除标注"
                                >
                                    ✕
                                </button>
                            </div>
                            <div class="annotation-coords">
                                <div class="annotation-text">
                                    X:{{ Math.round(annotation.x) }} Y:{{
                                        Math.round(annotation.y)
                                    }}
                                    W:{{ Math.round(annotation.width) }} H:{{
                                        Math.round(annotation.height)
                                    }}
                                </div>

                                <div
                                    class="category-colors"
                                    :style="{ background: getCategoryColor(annotation.categoryId) }"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 统计信息 -->
                <div class="stats-section">
                    <div class="section-title">统计信息</div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">{{ totalAnnotationsCount }}</div>
                            <div class="stat-label">全部标注数</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">{{ annotatedFilesCount }}</div>
                            <div class="stat-label">已标注图片</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">{{ categories.length }}</div>
                            <div class="stat-label">标注类别</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">{{ allFiles.length }}</div>
                            <div class="stat-label">总图片数</div>
                        </div>
                    </div>
                </div>

                <!-- 数据导出 -->
                <div class="export-section">
                    <div class="section-title">数据导出</div>
                    <div class="export-buttons">
                        <button
                            v-for="format in exportFormats"
                            :key="format.id"
                            class="export-btn"
                            :class="{ primary: format.primary }"
                            @click="exportData(format.id)"
                            :disabled="format.loading || totalAnnotationsCount === 0"
                        >
                            <span v-if="format.loading" class="loading"></span>
                            {{ format.loading ? '导出中...' : format.name }}
                        </button>
                    </div>

                    <!-- 导出选项 -->
                    <div class="export-options">
                        <label class="option-label">
                            <input type="checkbox" v-model="exportOptions.includeEmpty" />
                            包含无标注的图片
                        </label>
                        <!-- <label class="option-label">
                            <input type="checkbox" v-model="exportOptions.normalizeCoords" />
                            归一化坐标 (YOLO格式)
                        </label> -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'PropertiesPanel',
    props: {
        isCollapsed: {
            type: Boolean,
            default: true,
        },
        categories: {
            type: Array,
            required: true,
        },
        annotations: {
            type: Array,
            required: true,
        },
        selectedAnnotationId: {
            type: [Number, String],
            default: null,
        },
        selectedCategoryId: {
            type: [Number, String],
            default: null,
        },
        allFiles: {
            type: Array,
            default: () => [],
        },
        allAnnotations: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            showAddCategory: false,
            newCategoryName: '',
            newCategoryColor: '#dc2626',
            inputError: false,
            presetColors: [
                '#e11d48',
                '#f97316',
                '#eab308',
                '#22c55e',
                '#06b6d4',
                '#3b82f6',
                '#8b5cf6',
                '#ec4899',
                '#f59e0b',
                '#10b981',
                '#0ea5e9',
                '#a855f7',
                '#ef4444',
                '#84cc16',
                '#6366f1',
            ],
            exportFormats: [
                { id: 'txt', name: '导出 TXT (YOLO)', primary: true, loading: false },
                { id: 'json', name: '导出 JSON (COCO)', primary: false, loading: false },
                { id: 'xml', name: '导出 XML (PASCAL VOC)', primary: false, loading: false },
            ],
            exportOptions: {
                includeEmpty: false,
                normalizeCoords: true,
            },
        };
    },
    computed: {
        totalAnnotationsCount() {
            return this.allAnnotations.length;
        },

        annotatedFilesCount() {
            const annotatedFileIds = new Set();
            this.allAnnotations.forEach(annotation => {
                if (annotation.fileId) {
                    annotatedFileIds.add(annotation.fileId);
                }
            });
            return annotatedFileIds.size;
        },
    },
    methods: {
        togglePanel() {
            this.$emit('toggle-panel');
        },

        selectCategory(categoryId) {
            this.$emit('category-selected', categoryId);
        },

        startAddCategory() {
            this.showAddCategory = true;
            this.newCategoryName = '';
            // 选择第一个未被使用的颜色作为默认颜色
            this.newCategoryColor = this.getFirstUnusedColor();
            this.inputError = false;
            this.$nextTick(() => {
                if (this.$refs.categoryInput) {
                    this.$refs.categoryInput.focus();
                }
            });
        },

        cancelAddCategory() {
            this.showAddCategory = false;
            this.newCategoryName = '';
            this.inputError = false;
        },

        // 获取第一个未被使用的颜色
        getFirstUnusedColor() {
            return (
                this.presetColors.find(color => !this.isColorUsed(color)) || this.presetColors[0]
            );
        },

        // 检查颜色是否已被使用
        isColorUsed(color) {
            return this.categories.some(cat => cat.color === color);
        },

        // 选择颜色
        selectColor(color) {
            if (!this.isColorUsed(color)) {
                this.newCategoryColor = color;
            }
        },

        // 限制输入：只允许英文字母、数字、下划线
        restrictInput(event) {
            // 允许的特殊按键
            const allowedKeys = [
                'Backspace',
                'Delete',
                'Tab',
                'Escape',
                'Enter',
                'ArrowLeft',
                'ArrowRight',
                'ArrowUp',
                'ArrowDown',
                'Home',
                'End',
                'Control',
                'Meta',
                'Alt',
                'Shift',
            ];

            // 如果是特殊按键，允许通过
            if (allowedKeys.includes(event.key)) {
                return;
            }

            // 如果是组合键（Ctrl+A, Ctrl+C, Ctrl+V 等），允许通过
            if (event.ctrlKey || event.metaKey) {
                return;
            }

            // 检查输入字符是否符合规则：英文字母、数字、下划线
            const regex = /^[a-zA-Z0-9_]$/;
            if (!regex.test(event.key)) {
                event.preventDefault();
                // 设置红色边框状态
                this.inputError = true;
                // 3秒后清除红色边框
                setTimeout(() => {
                    this.inputError = false;
                }, 3000);
                return;
            }
        },

        // 验证类别名称
        validateCategoryName() {
            const name = this.newCategoryName;

            // 清除之前的错误状态
            this.inputError = false;

            if (!name) {
                return;
            }

            // 检查是否包含非法字符
            const regex = /^[a-zA-Z0-9_]*$/;
            if (!regex.test(name)) {
                this.inputError = true;
                return;
            }

            // 检查长度
            if (name.length > 50) {
                this.inputError = true;
                return;
            }

            // 检查是否以数字开头
            if (/^\d/.test(name)) {
                this.inputError = true;
                return;
            }
        },

        addCategory() {
            const name = this.newCategoryName.trim();

            if (!name) {
                this.$emit('message', { type: 'warning', message: '请输入类别名称' });
                return;
            }

            // 检查是否包含非法字符
            const regex = /^[a-zA-Z0-9_]+$/;
            if (!regex.test(name)) {
                this.$emit('message', {
                    type: 'error',
                    message: '类别名称只能包含英文字母、数字和下划线',
                });
                return;
            }

            // 检查是否以数字开头
            if (/^\d/.test(name)) {
                this.$emit('message', {
                    type: 'error',
                    message: '类别名称不能以数字开头',
                });
                return;
            }

            // 检查长度
            if (name.length > 50) {
                this.$emit('message', {
                    type: 'error',
                    message: '类别名称不能超过50个字符',
                });
                return;
            }

            // 检查是否重名
            if (this.categories.some(cat => cat.name === name)) {
                this.$emit('message', { type: 'warning', message: '类别名称已存在' });
                return;
            }

            // 检查颜色是否被使用过
            if (this.isColorUsed(this.newCategoryColor)) {
                this.$emit('message', {
                    type: 'warning',
                    message: '该颜色已被其他类别使用，请选择其他颜色',
                });
                return;
            }

            // 生成临时ID用于立即选择（父组件会替换为真实ID）
            const tempId = 'temp_' + Date.now();

            this.$emit('category-added', {
                tempId: tempId,
                name: name,
                color: this.newCategoryColor,
            });

            // 延迟选择新类别，等父组件处理完成
            this.$nextTick(() => {
                // 查找刚添加的类别（通过名称和颜色匹配）
                const newCategory = this.categories.find(
                    cat => cat.name === name && cat.color === this.newCategoryColor
                );
                if (newCategory) {
                    this.$emit('category-selected', newCategory.id);
                }
            });

            this.$emit('message', { type: 'success', message: '类别添加成功并已自动选择' });
            this.cancelAddCategory();
        },

        async deleteCategory(categoryId) {
            const count = this.getCategoryCount(categoryId);
            if (count > 0) {
                this.$emit('message', {
                    type: 'warning',
                    message: `该类别下还有 ${count} 个标注，无法删除`,
                });
                return;
            }

            try {
                await this.$confirm('确定要删除这个类别吗？', '删除类别');
                this.$emit('category-deleted', categoryId);
                this.$emit('message', { type: 'success', message: '类别删除成功' });
            } catch (error) {
                // 用户取消删除，不需要处理
            }
        },

        getCategoryCount(categoryId) {
            return this.annotations.filter(ann => ann.categoryId === categoryId).length;
        },

        getCategoryColor(categoryId) {
            const category = this.categories.find(cat => cat.id === categoryId);
            return category ? category.color : '#64748b';
        },

        selectAnnotation(annotationId) {
            this.$emit('annotation-selected', annotationId);
        },

        async deleteAnnotation(annotationId) {
            try {
                await this.$confirm('确定要删除这个标注吗？', '删除标注');
                this.$emit('annotation-deleted', annotationId);
                this.$emit('message', { type: 'success', message: '标注删除成功' });
            } catch (error) {
                // 用户取消删除，不需要处理
            }
        },

        async clearAllAnnotations() {
            try {
                await this.$confirm('确定要清空所有标注吗？此操作无法撤销。', '清空标注', {
                    type: 'error',
                });
                this.annotations.forEach(annotation => {
                    this.$emit('annotation-deleted', annotation.id);
                });
                this.$emit('message', { type: 'success', message: '已清空所有标注' });
            } catch (error) {
                // 用户取消操作，不需要处理
            }
        },

        async exportData(formatId) {
            if (this.totalAnnotationsCount === 0) {
                this.$emit('message', { type: 'warning', message: '没有可导出的标注数据' });
                return;
            }

            const hasUnlabeledImages = this.annotatedFilesCount < this.allFiles.length;

            if (hasUnlabeledImages && !this.exportOptions.includeEmpty) {
                const unlabeledCount = this.allFiles.length - this.annotatedFilesCount;
                try {
                    await this.$confirm(
                        `检测到有 ${unlabeledCount} 张图片尚未标注，这些图片将不会包含在导出数据中。
                        <br/>如需包含所有图片，请勾选"包含无标注的图片"选项。
                        <br/>确定要继续导出吗？`,
                        '未完成标注提醒',
                        {
                            type: 'warning',
                            dangerouslyUseHTMLString: true,
                            confirmButtonText: '继续导出',
                            cancelButtonText: '取消',
                            showClose: false,
                            closeOnClickModal: false,
                        }
                    );
                } catch (error) {
                    // 用户取消导出
                    return;
                }
            }

            const format = this.exportFormats.find(f => f.id === formatId);
            if (!format || format.loading) return;

            format.loading = true;

            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.$emit('export', {
                    format: formatId,
                    options: this.exportOptions,
                });
                this.$emit('message', { type: 'success', message: `${format.name} 导出成功` });
            } catch (error) {
                this.$emit('message', { type: 'error', message: `${format.name} 导出失败` });
            } finally {
                format.loading = false;
            }
        },
    },
    mounted() {
        const handleEscKey = e => {
            if (e.key === 'Escape') {
                if (this.showAddCategory) {
                    this.cancelAddCategory();
                } else if (!this.isCollapsed) {
                    this.togglePanel();
                }
            }
        };

        document.addEventListener('keydown', handleEscKey);
        this.$once('hook:beforeDestroy', () => {
            document.removeEventListener('keydown', handleEscKey);
        });
    },
};
</script>

<style type="scss" scoped>
/* 折叠状态的属性面板 - 简洁风格 */
.properties-collapsed {
    position: fixed;
    top: 60px;
    right: 0;
    width: 60px;
    height: calc(100vh - 60px);
    background: #ffffff;
    border-left: 1px solid #e2e8f0;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
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
    margin-bottom: 20px;
    color: #64748b;
}

/* 折叠状态类别列表 - 完整名称版 */
.collapsed-categories {
    flex: 1;
    width: 100%;
    max-height: 790px; /* 限制最大高度 */
    overflow-y: auto; /* 内容超出时显示滚动条 */
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 20px;
    padding: 0 2px;

    /* 自定义滚动条样式 */
    &::-webkit-scrollbar {
        width: 3px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(241, 245, 249, 0.5);
        border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(203, 213, 225, 0.8);
        border-radius: 2px;

        &:hover {
            background: rgba(148, 163, 184, 0.9);
        }
    }

    .collapsed-category-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 6px 4px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 44px;
        flex-shrink: 0;

        &:hover {
            background: rgba(59, 130, 246, 0.1);
            transform: translateY(-1px);
        }

        &.active {
            background: rgba(59, 130, 246, 0.15);

            .collapsed-category-name {
                color: #3b82f6;
                font-weight: 600;
            }
        }

        .collapsed-category-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
        }

        .collapsed-category-name {
            font-size: 9px;
            font-weight: 500;
            color: #475569;
            text-align: center;
            line-height: 1.1;
            word-break: break-all; /* 允许长单词换行 */
            hyphens: auto; /* 自动连字符 */
            max-width: 40px; /* 限制最大宽度 */
            overflow-wrap: break-word; /* 强制换行 */
        }
    }
}

/* 折叠状态统计 */
.collapsed-stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: auto;

    .stat-item {
        width: 32px;
        height: 32px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        .stat-number {
            font-size: 12px;
            font-weight: 700;
            color: #334155;
            line-height: 1;
        }

        .stat-text {
            font-size: 8px;
            color: #64748b;
            font-weight: 500;
            margin-top: 1px;
        }
    }
}

/* 展开状态的面板 */
.properties-expanded {
    position: fixed;
    top: 60px;
    right: -350px;
    width: 350px;
    height: calc(100vh - 60px);
    background: #ffffff;
    border-left: 1px solid #e2e8f0;
    box-shadow: -8px 0 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    z-index: 1001;
    overflow: hidden;
}

.properties-expanded.open {
    right: 60px;
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

/* 面板内容 */
.panel-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.categories-section,
.annotations-section,
.stats-section,
.export-section {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
}

.section-title {
    font-weight: 600;
    margin-bottom: 16px;
    color: #1e293b;
    font-size: 15px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.clear-all-btn {
    background: none;
    border: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clear-all-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #dc2626;
}

.category-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    margin: 6px 0;
    background: #ffffff;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
    cursor: pointer;
    box-sizing: border-box;
}

.category-item:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.category-item.selected {
    box-sizing: border-box;
    background: #f0f9ff;
    border-color: #3b82f6;
}

.category-info {
    display: flex;
    align-items: center;
    flex: 1;
}

.category-color {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    margin-right: 10px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
}
.annotation-coords {
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
}
.category-colors {
    margin-right: 1px;
    justify-content: space-between;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    /* margin-right: 10px; */
    border: 1px solid rgba(0, 0, 0, 0.1);
    /* flex-shrink: 0; */
}
.annotation-text {
    font-size: 11px;
    color: #64748b;
    font-family: 'Consolas', monospace;
    text-align: center;
    line-height: 16px;
}

.category-name {
    font-weight: 500;
    font-size: 14px;
    color: #334155;
}

.category-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.category-count {
    font-size: 12px;
    color: #64748b;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 12px;
    min-width: 24px;
    text-align: center;
}

.category-delete {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 3px;
    transition: all 0.2s ease;
}

.category-delete:hover:not(:disabled) {
    background: #fee2e2;
    color: #dc2626;
}

.category-delete:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* 添加类别表单 */
.add-category-form {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    margin: 12px 0;
}

.input-group {
    margin-bottom: 12px;
}

.category-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
}

.category-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.category-input.input-error {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.color-picker {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.color-option {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s ease;
    position: relative;
}

.color-option.selected {
    border-color: #334155;
    transform: scale(1.1);
}

.color-option.used {
    cursor: not-allowed;
    opacity: 0.5;
    position: relative;
}

.color-option.used::before {
    content: '✕';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: bold;
    font-size: 12px;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.form-actions {
    display: flex;
    gap: 8px;
}

.btn-confirm,
.btn-cancel {
    flex: 1;
    padding: 8px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

.btn-confirm {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.btn-confirm:enabled:hover {
    background: #2563eb;
}

.btn-confirm:disabled {
    background: #94a3b8;
    border-color: #94a3b8;
    cursor: not-allowed;
    opacity: 0.6;
}

.btn-cancel {
    background: white;
    color: #64748b;
}

.btn-cancel:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.add-category-btn {
    width: 100%;
    padding: 12px;
    background: #f8fafc;
    color: #64748b;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    margin-top: 12px;
    font-size: 14px;
}

.add-category-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #334155;
}

.annotation-list {
    box-sizing: border-box;
    max-height: 300px;
    overflow-y: auto;
}

.empty-annotations {
    text-align: center;
    color: #64748b;
    font-style: italic;
    padding: 20px;
}

.annotation-item {
    box-sizing: border-box;
    background: #ffffff;
    padding: 12px;
    margin: 8px 0;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
}

.annotation-item:hover {
    box-sizing: border-box;
    background: #f8fafc;
    border-color: #cbd5e1;
}

.annotation-item.selected {
    box-sizing: border-box;
    background: #f0f9ff;
    border-color: #3b82f6;
    box-sizing: border-box;
}

.annotation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.annotation-title {
    font-weight: 500;
    font-size: 14px;
    color: #334155;
}

.annotation-delete {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 12px;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.annotation-delete:hover {
    background: #fee2e2;
    color: #dc2626;
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.stats-section .stat-item {
    text-align: center;
    padding: 16px;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
}

.stats-section .stat-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #334155;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 12px;
    color: #64748b;
}

.export-buttons {
    display: flex;
    gap: 12px;
    flex-direction: column;
    margin-bottom: 16px;
}

.export-btn {
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    background: #ffffff;
    color: #334155;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.export-btn:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.export-btn.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.export-btn.primary:hover:not(:disabled) {
    background: #2563eb;
}

.export-options {
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
    margin-top: 16px;
}

.option-label {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;
    color: #334155;
    cursor: pointer;
}

.option-label input {
    margin-right: 8px;
}

.loading {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #e2e8f0;
    border-radius: 50%;
    border-top-color: #3b82f6;
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* 滚动条样式 */
.annotation-list::-webkit-scrollbar,
.panel-content::-webkit-scrollbar {
    width: 4px;
}

.annotation-list::-webkit-scrollbar-track,
.panel-content::-webkit-scrollbar-track {
    background: #f1f5f9;
}

.annotation-list::-webkit-scrollbar-thumb,
.panel-content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
}

@media (max-width: 768px) {
    .properties-collapsed {
        width: 50px;
    }

    .properties-expanded {
        width: calc(100% - 50px);
        right: -100%;
    }

    .properties-expanded.open {
        right: 50px;
    }

    .collapsed-category-dot {
        width: 16px;
        height: 16px;
    }

    .stats-grid {
        grid-template-columns: 1fr;
    }
}
</style>
