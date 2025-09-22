<!-- components/PaginationControl.vue -   -->
<template>
    <div
        v-if="currentFile"
        class="pagination-control"
        :class="{
            minimized: isMinimized,
            'hover-zone': isMinimized,
        }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @click="handleClick"
    >
        <!-- 最小化状态的触发条 -->
        <div v-if="isMinimized" class="minimized-trigger">
            <div class="trigger-bar">
                <div class="file-indicator">
                    <span class="file-progress">{{ currentIndex + 1 }}/{{ totalFiles }}</span>
                    <!-- <div class="feature-dots">
                        <span
                            class="feature-dot"
                            :class="{ active: showAllLabels }"
                            title="标签显示"
                        >
                            🏷
                        </span>
                        <span
                            class="feature-dot"
                            :class="{ active: highlightMode }"
                            title="高亮模式"
                        >
                            ✨
                        </span>
                    </div> -->
                </div>
                <div class="file-name-mini">
                    {{ currentFile.name.substring(0, 80)
                    }}{{ currentFile.name.length > 80 ? '...' : '' }}
                </div>
                <div class="minimize-handle"></div>
            </div>
        </div>

        <div class="control-content" :class="{ hidden: isMinimized }">
            <div class="minimize-controls">
                <button
                    class="minimize-btn tooltip"
                    data-tooltip="最小化控制栏"
                    @click.stop="toggleMinimize"
                >
                    ▼
                </button>
            </div>

            <div class="control-group">
                <button
                    class="control-btn tooltip"
                    :class="{ disabled: !canGoPrevious }"
                    :disabled="!canGoPrevious"
                    :data-tooltip="canGoPrevious ? '上一张图片 (←)' : '已是第一张'"
                    @click="goToPrevious"
                >
                    ←
                </button>

                <div class="page-display">
                    <span class="current-page">{{ currentIndex + 1 }}</span>
                    <span class="separator">/</span>
                    <span class="total-pages">{{ totalFiles }}</span>
                </div>

                <button
                    class="control-btn tooltip"
                    :class="{ disabled: !canGoNext }"
                    :disabled="!canGoNext"
                    :data-tooltip="canGoNext ? '下一张图片 (→)' : '已是最后一张'"
                    @click="goToNext"
                >
                    →
                </button>
            </div>

            <!-- 功能控制组 -->
            <div class="control-group">
                <button
                    class="control-btn tooltip"
                    :class="{ active: showAllLabels }"
                    :data-tooltip="showAllLabels ? '隐藏所有标签' : '显示所有标签'"
                    @click="toggleLabels"
                >
                    🏷
                </button>

                <button
                    class="control-btn tooltip"
                    :class="{ active: highlightMode }"
                    :data-tooltip="highlightMode ? '关闭高亮模式' : '开启高亮模式'"
                    @click="toggleHighlight"
                >
                    ✨
                </button>
            </div>

            <!-- 文件信息显示 -->
            <div class="file-info">
                <span class="file-name">{{ currentFile.name }}</span>
                <span class="annotation-count">{{ annotationCount }}个标注</span>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'PaginationControl',
    props: {
        currentFile: {
            type: Object,
            default: null,
        },
        allFiles: {
            type: Array,
            default: () => [],
        },
        annotationCount: {
            type: Number,
            default: 0,
        },
        showAllLabels: {
            type: Boolean,
            default: false,
        },
        highlightMode: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            isMinimized: false,
            hoverTimeout: null,
            autoMinimizeTimeout: null,
        };
    },
    computed: {
        currentIndex() {
            if (!this.currentFile || !this.allFiles.length) return -1;
            return this.allFiles.findIndex(file => file.id === this.currentFile.id);
        },

        totalFiles() {
            return this.allFiles.length;
        },

        canGoPrevious() {
            return this.currentIndex > 0;
        },

        canGoNext() {
            return this.currentIndex >= 0 && this.currentIndex < this.totalFiles - 1;
        },
    },
    mounted() {
        this.startAutoMinimizeTimer();
        // 监听键盘事件重置计时器
        document.addEventListener('keydown', this.handleActivity);
        document.addEventListener('mousemove', this.handleActivity);
    },
    beforeDestroy() {
        this.clearTimeouts();
        document.removeEventListener('keydown', this.handleActivity);
        document.removeEventListener('mousemove', this.handleActivity);
    },
    methods: {
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

        handleActivity() {
            this.clearTimeouts();
            if (!this.isMinimized) {
                this.startAutoMinimizeTimer();
            }
        },

        startAutoMinimizeTimer() {
            this.autoMinimizeTimeout = setTimeout(() => {
                this.isMinimized = true;
            }, 4000);
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

        goToPrevious() {
            if (this.canGoPrevious) {
                const prevFile = this.allFiles[this.currentIndex - 1];
                this.$emit('file-changed', prevFile.id);
                this.handleActivity();
            }
        },

        goToNext() {
            if (this.canGoNext) {
                const nextFile = this.allFiles[this.currentIndex + 1];
                this.$emit('file-changed', nextFile.id);
                this.handleActivity();
            }
        },

        toggleLabels() {
            this.$emit('toggle-labels');
            this.handleActivity();
        },

        toggleHighlight() {
            this.$emit('toggle-highlight');
            this.handleActivity();
        },
    },
};
</script>

<style scoped>
.pagination-control {
    position: fixed;
    bottom: 20px;
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
    pointer-events: auto;
}

/* 最小化状态 */
.pagination-control.minimized {
    bottom: -2px; /* 向下偏移，只露出上半部分 */
    border-radius: 16px 16px 0 0;
    border-bottom: none;
    height: 28px;
    width: 320px;
    cursor: pointer;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
    background: rgba(248, 250, 252, 0.98);
}

.pagination-control.minimized:hover {
    bottom: -2px; /* 向上移动4px */
    height: 30px;
    box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.98);
}

/* 最小化触发条 */
.minimized-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 16px;
}

.trigger-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 14px;
}

.file-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
}

.file-progress {
    font-size: 11px;
    font-weight: 600;
    color: #3b82f6;
}

.feature-dots {
    display: flex;
    gap: 4px;
}

.feature-dot {
    font-size: 8px;
    opacity: 0.5;
    transition: all 0.2s ease;
}

.feature-dot.active {
    opacity: 1;
    transform: scale(1.1);
}

.minimize-handle {
    width: 32px;
    height: 3px;
    background: #cbd5e1;
    border-radius: 2px;
    transition: all 0.2s ease;
}

.pagination-control.minimized:hover .minimize-handle {
    background: #94a3b8;
    width: 36px;
}

.file-name-mini {
    text-align: center;
    width: 150px;
    font-size: 10px;
    color: #64748b;
    font-weight: 500;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 控制栏内容 */
.control-content {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 1;
    transform: translateY(0);
}

.control-content.hidden {
    opacity: 0;
    transform: translateY(10px);
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

/* 原有样式保持 */
.control-group {
    display: flex;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
}

.control-btn {
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

.control-btn:last-child {
    border-right: none;
}

.control-btn:hover:not(:disabled):not(.disabled):not(.active) {
    background: #e2e8f0;
    color: #334155;
}
.control-btn.active:hover {
    background: #1e293b;
    color: white;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
}
.control-btn.active {
    background: #334155;
    color: white;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-btn:disabled,
.control-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

.control-btn:disabled:hover,
.control-btn.disabled:hover {
    background: transparent;
    color: #475569;
}

.page-display {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    font-size: 14px;
    color: #374151;
    font-weight: 500;
    min-width: 60px;
    justify-content: center;
    user-select: none;
}

.current-page {
    color: #3b82f6;
    font-weight: 600;
}

.separator {
    color: #9ca3af;
}

.file-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px;
    max-width: 200px;
}

.file-name {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.annotation-count {
    font-size: 11px;
    color: #6b7280;
}

/* 工具提示 */
.tooltip {
    position: relative;
}

.tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    top: calc(-100% - 10px);
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
    top: calc(-100% - 4px);
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 6px 6px 6px;
    border-color: transparent transparent rgba(30, 41, 59, 0.95) transparent;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 1000;
}

.tooltip:hover::after,
.tooltip:hover::before {
    opacity: 1;
}

.control-btn.active::after {
    background: rgba(51, 65, 85, 0.95);
}

.control-btn.active::before {
    border-color: transparent transparent rgba(51, 65, 85, 0.95) transparent;
}

/* 动画效果 */
@keyframes controlActivate {
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

.control-btn.active {
    animation: controlActivate 0.2s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .pagination-control {
        bottom: 10px;
        padding: 10px;
        gap: 6px;
    }

    .pagination-control.minimized {
        width: calc(100% - 20px);
        bottom: -10px;
    }

    .control-content {
        flex-wrap: wrap;
        justify-content: center;
    }

    .file-info {
        order: -1;
        width: 100%;
        text-align: center;
        max-width: none;
        margin-bottom: 8px;
        padding: 8px;
        background: #f8fafc;
        border-radius: 6px;
    }

    .control-btn {
        min-width: 40px;
        padding: 12px;
    }
}

@media (max-width: 480px) {
    .pagination-control {
        padding: 8px;
        gap: 4px;
        bottom: 10px;
    }

    .pagination-control.minimized {
        bottom: -8px;
        height: 20px;
    }

    .control-btn {
        padding: 8px 10px;
        font-size: 12px;
        min-width: 32px;
    }

    .page-display {
        font-size: 12px;
        min-width: 50px;
        padding: 0 6px;
    }

    .file-name {
        font-size: 12px;
    }

    .annotation-count {
        font-size: 10px;
    }

    .tooltip::after,
    .tooltip::before {
        display: none;
    }

    .trigger-bar {
        gap: 6px;
    }

    .file-name-mini {
        max-width: 80px;
        font-size: 9px;
    }
}
</style>
