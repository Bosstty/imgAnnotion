<!-- components/FloatingToolbar.vue -->
<template>
    <div
        class="floating-toolbar"
        :class="{
            minimized: isMinimized,
            'hover-zone': isMinimized,
        }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @click="handleClick"
    >
        <!-- 最小化状态的触发条 - 改为进度显示 -->
        <div v-if="isMinimized" class="minimized-trigger">
            <div class="trigger-bar">
                <div class="progress-info">
                    <!-- <span class="file-progress">{{ annotatedFilesCount }}/{{ totalFiles }}</span> -->
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div
                                class="progress-fill"
                                :style="{
                                    width: annotationProgressPercent + '%',
                                    backgroundColor: progressColor,
                                }"
                            ></div>
                        </div>
                        <span class="progress-text">{{ annotationProgressPercent }}%</span>
                    </div>
                </div>
                <div class="minimize-handle"></div>
            </div>
        </div>

        <!-- 完整工具栏内容 -->
        <div class="toolbar-content" :class="{ hidden: isMinimized }">
            <!-- 主要工具组 -->
            <div class="tool-group">
                <button
                    v-for="tool in mainTools"
                    :key="tool.id"
                    class="tool-btn tooltip"
                    :class="{ active: activeTool === tool.id }"
                    :data-tooltip="tool.tooltip"
                    @click="selectTool(tool.id)"
                >
                    {{ tool.icon }}
                </button>
            </div>

            <!-- 操作工具组 -->
            <div class="tool-group">
                <button
                    v-for="action in actionTools"
                    :key="action.id"
                    class="tool-btn tooltip"
                    :data-tooltip="action.tooltip"
                    @click="executeAction(action.id)"
                    :disabled="action.id === 'delete' && !hasSelection"
                >
                    {{ action.icon }}
                </button>
            </div>

            <!-- 辅助工具组 -->
            <div class="tool-group">
                <button
                    v-for="helper in helperTools"
                    :key="helper.id"
                    class="tool-btn tooltip"
                    :data-tooltip="helper.tooltip"
                    @click="executeAction(helper.id)"
                >
                    {{ helper.icon }}
                </button>
            </div>

            <!-- 缩放控制 -->
            <div class="zoom-control">
                <button
                    class="zoom-btn"
                    data-tooltip="缩小"
                    @click="changeZoom(-25)"
                    :disabled="zoom <= 25"
                >
                    −
                </button>
                <div class="zoom-display">{{ zoom }}%</div>
                <button class="zoom-btn" @click="changeZoom(25)" :disabled="zoom >= 400">+</button>
                <button class="tool-btn" @click="executeAction('fit')">⧉</button>
            </div>
            <!-- 最小化按钮 -->
            <div class="minimize-controls">
                <button
                    class="minimize-btn"
                    data-tooltip="最小化工具栏"
                    @click.stop="toggleMinimize"
                >
                    ▲
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'FloatingToolbar',
    props: {
        activeTool: {
            type: String,
            default: 'select',
        },
        zoom: {
            type: Number,
            default: 100,
        },
        hasSelection: {
            type: Boolean,
            default: false,
        },
        currentFileIndex: {
            type: Number,
            default: 0,
        },
        totalFiles: {
            type: Number,
            default: 0,
        },
        annotationCount: {
            type: Number,
            default: 0,
        },
        totalAnnotations: {
            type: Number,
            default: 0,
        },
        allAnnotations: {
            type: Array,
            default: () => [],
        },
    },
    data() {
        return {
            isMinimized: false,
            hoverTimeout: null,
            autoMinimizeTimeout: null,
            mainTools: [
                { id: 'select', icon: '⚹', tooltip: '选择工具 (V)', color: '#3b82f6' },
                { id: 'rectangle', icon: '▭', tooltip: '矩形标注 (R)', color: '#10b981' },
                // { id: 'move', icon: '✋', tooltip: '移动工具 (M)', color: '#f59e0b' },
            ],
            actionTools: [{ id: 'delete', icon: '🗑', tooltip: '删除选中 (Delete)' }],
            helperTools: [
                { id: 'copy', icon: '📋', tooltip: '复制标注 (Ctrl+C)' },
                { id: 'paste', icon: '📌', tooltip: '粘贴标注 (Ctrl+V)' },
                { id: 'fullscreen', icon: '⛶', tooltip: '全屏模式 (F11)' },
            ],
        };
    },
    computed: {
        annotatedFilesCount() {
            if (!this.allAnnotations || this.allAnnotations.length === 0) return 0;
            const annotatedFileIds = new Set();
            this.allAnnotations.forEach(annotation => {
                if (annotation.fileId) {
                    annotatedFileIds.add(annotation.fileId);
                }
            });
            return annotatedFileIds.size;
        },

        // 计算已标注文件的进度百分比
        annotationProgressPercent() {
            if (this.totalFiles === 0) return 0;
            const progress = (this.annotatedFilesCount / this.totalFiles) * 100;
            return Math.round(progress);
        },

        // 根据进度计算颜色
        progressColor() {
            const percent = this.annotationProgressPercent;
            if (percent <= 30) {
                return '#F56C6C';
            } else if (percent <= 70) {
                return '#E6A23C';
            } else {
                return '#67C23A';
            }
        },
    },
    mounted() {
        document.addEventListener('keydown', this.handleKeyDown);
        this.startAutoMinimizeTimer();
    },
    beforeDestroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.clearTimeouts();
    },
    methods: {
        getActiveToolColor() {
            const activeTool = this.mainTools.find(tool => tool.id === this.activeTool);
            return activeTool ? activeTool.color : '#64748b';
        },

        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            this.clearTimeouts();
            if (!this.isMinimized) {
                this.startAutoMinimizeTimer();
            }
        },

        handleMouseEnter() {
            this.clearTimeouts();
            if (this.isMinimized) {
                // 延迟展开，避免误触
                this.hoverTimeout = setTimeout(() => {
                    this.isMinimized = false;
                    this.startAutoMinimizeTimer();
                }, 200);
            }
        },

        handleMouseLeave() {
            this.clearTimeouts();
            if (!this.isMinimized) {
                this.startAutoMinimizeTimer();
            }
        },

        handleClick() {
            if (this.isMinimized) {
                this.isMinimized = false;
                this.clearTimeouts();
                this.startAutoMinimizeTimer();
            }
        },

        startAutoMinimizeTimer() {
            this.autoMinimizeTimeout = setTimeout(() => {
                this.isMinimized = true;
            }, 3000);
        },

        clearTimeouts() {
            if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }
            if (this.autoMinimizeTimeout) {
                clearTimeout(this.autoMinimizeTimeout);
                this.autoMinimizeTimeout = null;
            }
        },

        selectTool(toolId) {
            this.$emit('tool-changed', toolId);
            this.clearTimeouts();
            this.startAutoMinimizeTimer();
        },

        executeAction(actionId) {
            this.$emit('action', actionId);
            this.clearTimeouts();
            this.startAutoMinimizeTimer();
        },

        changeZoom(delta) {
            const newZoom = Math.max(25, Math.min(400, this.zoom + delta));
            this.$emit('zoom-changed', newZoom);
            this.clearTimeouts();
            this.startAutoMinimizeTimer();
        },

        handleKeyDown(event) {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // 重置自动最小化计时器
            this.clearTimeouts();
            if (!this.isMinimized) {
                this.startAutoMinimizeTimer();
            }

            switch (event.key.toLowerCase()) {
                case 'v':
                    if (!event.ctrlKey) this.selectTool('select');
                    break;
                case 'r':
                    this.selectTool('rectangle');
                    break;
                case 'm':
                    this.selectTool('move');
                    break;
                case 'delete':
                case 'backspace':
                    if (this.hasSelection) {
                        this.executeAction('delete');
                    }
                    break;
                case 'z':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.executeAction('undo');
                    }
                    break;
                case 'y':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.executeAction('redo');
                    }
                    break;
                case 'c':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.executeAction('copy');
                    }
                    break;
                case 'v':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.executeAction('paste');
                    }
                    break;
                case 'f11':
                    event.preventDefault();
                    this.executeAction('fullscreen');
                    break;
                case '+':
                case '=':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.changeZoom(25);
                    }
                    break;
                case '-':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.changeZoom(-25);
                    }
                    break;
                case '0':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.executeAction('fit');
                    }
                    break;
                // 按T键切换最小化
                case 't':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.toggleMinimize();
                    }
                    break;
            }
        },
    },
};
</script>

<style scoped>
.floating-toolbar {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 900;
    max-width: calc(100vw - 40px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
}

/* 最小化状态 */
.floating-toolbar.minimized {
    top: 0px;
    border-radius: 0 0 16px 16px;
    border-top: none;
    height: 27px;
    width: 220px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    background: rgba(248, 250, 252, 0.98);
}

.floating-toolbar.minimized:hover {
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.98);
}

/* 最小化触发条 - 新设计 */
.minimized-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 12px;
}

.trigger-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    gap: 10px;
}

.progress-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.file-progress {
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    min-width: 28px;
    text-align: center;
}

.progress-container {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

.progress-bar {
    flex: 1;
    height: 6px;
    background: #f1f5f9;
    border-radius: 3px;
    overflow: hidden;
    min-width: 70px;
    border: 1px solid #e2e8f0;
}

.progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease;
    position: relative;
    background: #7aa67a; /* 默认绿色 */
}

.progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    right: -15px;
    width: 15px;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 100%);
    animation: progressShimmer 2.5s infinite ease-in-out;
}

.progress-text {
    font-size: 9px;
    color: #64748b;
    font-weight: 600;
    min-width: 24px;
    text-align: right;
}

.minimize-handle {
    width: 24px;
    height: 3px;
    background: #cbd5e1;
    border-radius: 2px;
    transition: all 0.2s ease;
}

.floating-toolbar.minimized:hover .minimize-handle {
    background: #94a3b8;
    width: 28px;
}

/* 工具栏内容 */
.toolbar-content {
    display: flex;
    gap: 8px;
    padding: 12px;
    align-items: center;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 1;
    transform: translateY(0);
}

.toolbar-content.hidden {
    opacity: 0;
    transform: translateY(-10px);
    height: 0;
    padding: 0 12px;
    pointer-events: none;
}

/* 最小化控制 */
.minimize-controls {
    display: flex;
    background: #f1f5f9;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
}

.minimize-btn {
    padding: 6px 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 10px;
    color: #64748b;
    font-weight: bold;
    min-width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.minimize-btn:hover {
    background: #e2e8f0;
    color: #475569;
}

/* 原有样式保持不变 */
.tool-group {
    display: flex;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
}

.tool-btn {
    padding: 10px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    color: #475569;
    border-right: 1px solid #e2e8f0;
    position: relative;
    min-width: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tool-btn:last-child {
    border-right: none;
}

.tool-btn:hover:not(:disabled):not(:active):not(.active) {
    background: #e2e8f0;
    color: #334155;
}

.tool-btn.active {
    background: #334155;
    color: white;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tool-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.tool-btn:disabled:hover {
    background: transparent;
    color: #475569;
}

.zoom-control {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    padding: 4px;
}

.zoom-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: #475569;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
}

.zoom-btn:hover:not(:disabled) {
    background: #e2e8f0;
}

.zoom-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.zoom-display {
    background: transparent;
    padding: 4px 8px;
    font-weight: 500;
    min-width: 50px;
    text-align: center;
    font-size: 12px;
    color: #334155;
    border-radius: 4px;
    user-select: none;
}

.tooltip {
    position: relative;
}

.tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 41, 59, 0.95);
    color: white;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
}

.tooltip::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 6px 6px 0 6px;
    border-color: rgba(30, 41, 59, 0.95) transparent transparent transparent;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 1000;
}

.tooltip:hover::after,
.tooltip:hover::before {
    opacity: 1;
}

.tool-btn.active::after {
    background: rgba(51, 65, 85, 0.95);
}

.tool-btn.active::before {
    border-color: rgba(51, 65, 85, 0.95) transparent transparent transparent;
}

/* 动画效果 */
@keyframes progressShimmer {
    0% {
        transform: translateX(-15px);
        opacity: 0;
    }
    50% {
        opacity: 0.7;
    }
    100% {
        transform: translateX(15px);
        opacity: 0;
    }
}

@keyframes toolActivate {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(0.95);
    }
    100% {
        transform: scale(1);
    }
}

.tool-btn.active {
    animation: toolActivate 0.2s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .floating-toolbar {
        position: static;
        transform: none;
        margin: 10px;
        justify-content: center;
        flex-wrap: wrap;
    }

    .floating-toolbar.minimized {
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
    }

    .tool-group {
        flex-wrap: wrap;
    }

    .zoom-control {
        order: -1;
        width: 100%;
        justify-content: center;
        margin-bottom: 8px;
    }

    .tool-btn {
        min-width: 40px;
        padding: 12px;
    }
}

@media (max-width: 480px) {
    .floating-toolbar.minimized {
        width: calc(100% - 20px);
    }

    .tool-btn {
        padding: 8px 10px;
        font-size: 12px;
        min-width: 32px;
    }

    .zoom-btn {
        width: 32px;
        height: 32px;
        font-size: 12px;
    }

    .zoom-display {
        font-size: 11px;
        padding: 4px 6px;
        min-width: 40px;
    }

    .tooltip::after,
    .tooltip::before {
        display: none;
    }
}
</style>
