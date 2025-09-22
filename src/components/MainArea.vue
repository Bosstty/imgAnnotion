<!-- components/MainArea.vue - 图片标注 -->
<template>
    <div class="main-area">
        <FloatingToolbar
            :activeTool="activeTool"
            :zoom="zoom"
            :hasSelection="!!selectedAnnotationId"
            :currentFileIndex="currentFileIndex"
            :totalFiles="totalFiles"
            :annotationCount="annotationCount"
            :totalAnnotations="totalAnnotations"
            :allAnnotations="allAnnotations"
            @tool-changed="$emit('tool-changed', $event)"
            @zoom-changed="$emit('zoom-changed', $event)"
            @action="handleToolbarAction"
        />

        <PaginationControl
            :currentFile="activeFile"
            :allFiles="allFiles"
            :annotationCount="annotations.length"
            :showAllLabels="showAllLabels"
            :highlightMode="highlightMode"
            @file-changed="handleFileChanged"
            @toggle-labels="toggleShowAllLabels"
            @toggle-highlight="toggleHighlightMode"
        />

        <!-- 画布区域 -->
        <div class="canvas-container" ref="canvasContainer">
            <div
                class="canvas-area"
                :class="{ panning: isPanning }"
                ref="canvasArea"
                @wheel.prevent="handleWheel"
                @mousemove="handleCanvasMouseMove"
                @mouseleave="handleCanvasMouseLeave"
                @mousedown="handleCanvasMouseDown"
                @mouseup="handleCanvasMouseUp"
            >
                <div v-if="activeTool === 'rectangle' && showGuidelines" class="guidelines-overlay">
                    <div
                        class="guideline-vertical"
                        :style="{ left: canvasMousePos.x + 'px' }"
                    ></div>

                    <div
                        class="guideline-horizontal"
                        :style="{ top: canvasMousePos.y + 'px' }"
                    ></div>
                </div>

                <div v-if="!activeFile" class="canvas-placeholder">
                    <div class="placeholder-icon">🖼</div>
                    <div class="placeholder-title">选择图片开始标注</div>
                    <div class="placeholder-hint">支持 PNG、JPG、JPEG 格式图片</div>
                </div>

                <div
                    v-else
                    class="image-container"
                    :style="containerStyle"
                    @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseLeave"
                    @dblclick="centerImage"
                >
                    <!-- 图片 -->
                    <img
                        ref="image"
                        :src="activeFile.url"
                        :alt="activeFile.name"
                        class="annotation-image"
                        draggable="false"
                        @load="handleImageLoad"
                        @error="handleImageError"
                    />

                    <div
                        v-if="highlightMode && normalizedAnnotations.length > 0"
                        class="highlight-overlay"
                    >
                        <svg
                            class="highlight-mask"
                            :width="displayWidth"
                            :height="displayHeight"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <mask id="highlightMask">
                                    <rect
                                        :width="displayWidth"
                                        :height="displayHeight"
                                        fill="white"
                                    />
                                    <rect
                                        v-for="annotation in normalizedAnnotations"
                                        :key="'mask-' + annotation.id"
                                        :x="annotation.x"
                                        :y="annotation.y"
                                        :width="annotation.width"
                                        :height="annotation.height"
                                        fill="black"
                                    />
                                </mask>
                            </defs>
                            <rect
                                :width="displayWidth"
                                :height="displayHeight"
                                fill="rgba(0, 0, 0, 0.5)"
                                mask="url(#highlightMask)"
                            />
                        </svg>
                    </div>

                    <div
                        v-for="annotation in normalizedAnnotations"
                        :key="annotation.id"
                        class="annotation-box"
                        :class="[
                            {
                                selected: selectedAnnotationId === annotation.id,
                                'can-select': activeTool === 'select',
                                'highlight-mode': highlightMode,
                            },
                            `category-${annotation.categoryId}`,
                        ]"
                        :style="getAnnotationStyle(annotation)"
                        @mousedown.stop="handleAnnotationMouseDown(annotation.id, $event)"
                        @mousemove="handleAnnotationMouseMove(annotation.id, $event)"
                        @mouseenter="handleAnnotationHover(annotation.id, true)"
                        @mouseleave="handleAnnotationHover(annotation.id, false)"
                    >
                        <div
                            v-if="
                                (activeTool === 'select' &&
                                    hoveredAnnotationId === annotation.id) ||
                                showAllLabels
                            "
                            class="annotation-label"
                            :class="{
                                'hover-label':
                                    hoveredAnnotationId === annotation.id && !showAllLabels,
                                'always-show-label': showAllLabels,
                            }"
                            :style="getHoverLabelStyle(annotation)"
                        >
                            {{ annotation.title }}
                        </div>

                        <!-- 调整句柄 -->
                        <div
                            v-if="selectedAnnotationId === annotation.id && activeTool === 'select'"
                            class="resize-handles"
                        >
                            <div
                                v-for="handle in resizeHandles"
                                :key="handle"
                                :class="['resize-handle', handle]"
                                @mousedown.stop="startResize(annotation.id, handle, $event)"
                            ></div>
                        </div>
                    </div>

                    <div
                        v-if="drawingAnnotation"
                        class="annotation-box drawing"
                        :style="getDrawingStyle()"
                    ></div>
                </div>
            </div>

            <div class="status-indicator">
                <span class="status-dot" :class="statusClass"></span>
                {{ statusText }}
            </div>
        </div>
    </div>
</template>

<script>
import FloatingToolbar from './FloatingToolbar.vue';
import PaginationControl from './PaginationControl.vue';

export default {
    name: 'MainArea',
    components: {
        FloatingToolbar,
        PaginationControl,
    },
    props: {
        activeFile: {
            type: Object,
            default: null,
        },
        zoom: {
            type: Number,
            default: 100,
        },
        activeTool: {
            type: String,
            default: 'rectangle',
        },
        categories: {
            type: Array,
            required: true,
        },
        selectedCategoryId: {
            type: [Number, String],
            required: true,
        },
        annotations: {
            type: Array,
            default: () => [],
        },
        selectedAnnotationId: {
            type: [Number, String],
            default: null,
        },
        allFiles: {
            type: Array,
            default: () => [],
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
            statusText: '系统就绪 • 待加载图片',
            statusClass: 'ready',

            imageLoaded: false,
            naturalWidth: 0,
            naturalHeight: 0,
            displayWidth: 0,
            displayHeight: 0,

            isDrawing: false,
            drawingAnnotation: null,
            startPoint: null,

            isDragging: false,
            dragOffset: null,
            isResizing: false,
            resizeHandle: null,
            resizeAnnotationId: null,
            resizeHandles: ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'],

            isMoving: false,
            moveAnnotationId: null,
            moveStartPos: null,
            currentCursor: 'default',

            mousePos: { x: 0, y: 0 },
            canvasMousePos: { x: 0, y: 0 },
            showGuidelines: false,
            hoveredAnnotationId: null,

            panX: 0,
            panY: 0,
            isPanning: false,
            panStartPos: null,
            spacePressed: false,

            showAllLabels: false,
            highlightMode: false,
        };
    },
    computed: {
        containerStyle() {
            const scale = this.zoom / 100;
            return {
                transform: `translate(${this.panX}px, ${this.panY}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: this.isPanning ? 'none' : 'transform 0.2s ease-out',
            };
        },

        selectedCategory() {
            return this.categories.find(cat => cat.id === this.selectedCategoryId);
        },

        // 标注坐标显示转换
        normalizedAnnotations() {
            if (!this.imageLoaded || !this.naturalWidth || !this.naturalHeight) {
                return this.annotations;
            }

            return this.annotations.map(annotation => {
                const displayCoords = this.absoluteToDisplayCoords(annotation);
                return {
                    ...annotation,
                    x: displayCoords.x,
                    y: displayCoords.y,
                    width: displayCoords.width,
                    height: displayCoords.height,
                };
            });
        },

        // // 当前文件在文件列表中的索引
        // currentFileIndex() {
        //     if (!this.activeFile || !this.allFiles.length) return -1;
        //     return this.allFiles.findIndex(file => file.id === this.activeFile.id);
        // },

        canGoPrevious() {
            return this.currentFileIndex > 0;
        },

        canGoNext() {
            return this.currentFileIndex >= 0 && this.currentFileIndex < this.allFiles.length - 1;
        },
    },
    watch: {
        activeFile(newFile, oldFile) {
            if (newFile) {
                this.statusText = `已加载: ${newFile.name}`;
                this.statusClass = 'loaded';
                this.imageLoaded = false;
                this.resetView();
                // this.resetFeatureStates();
                this.resetInteraction();
            } else {
                this.statusText = '系统就绪 • 待加载图片';
                this.statusClass = 'ready';
                this.resetInteraction();
                this.resetView();
                // this.resetFeatureStates();
            }
        },

        activeTool(newTool) {
            this.resetInteraction();
            if (newTool === 'rectangle') {
                this.statusText =
                    '点击并拖拽绘制矩形标注框 • 滚轮:缩放 • Shift/Ctrl+滚轮:平移 • 双击/Ctrl+C:居中';
                this.statusClass = 'drawing';
            } else {
                this.statusText = this.activeFile
                    ? `已加载: ${this.activeFile.name}`
                    : '系统就绪 • 待加载图片';
                this.statusClass = this.activeFile ? 'loaded' : 'ready';
                this.showGuidelines = false;
            }
        },
    },
    mounted() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('mouseup', this.handleDocumentMouseUp);
        document.addEventListener('mousemove', this.handleDocumentMouseMove);

        document.addEventListener('fullscreenchange', this.handleViewportChange);
        window.addEventListener('resize', this.handleViewportChange);
    },
    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mouseup', this.handleDocumentMouseUp);
        document.removeEventListener('mousemove', this.handleDocumentMouseMove);
        document.removeEventListener('fullscreenchange', this.handleViewportChange);
        window.removeEventListener('resize', this.handleViewportChange);
    },
    methods: {
        handleFileChanged(fileId) {
            this.$emit('file-changed', fileId);
        },

        // 翻页导航方法
        goToPreviousFile() {
            if (this.canGoPrevious) {
                const prevFile = this.allFiles[this.currentFileIndex - 1];
                this.handleFileChanged(prevFile.id);
            }
        },

        goToNextFile() {
            if (this.canGoNext) {
                const nextFile = this.allFiles[this.currentFileIndex + 1];
                this.handleFileChanged(nextFile.id);
            }
        },

        // 统一的坐标转换方法
        getImageCoordinates(event) {
            if (!this.$refs.image) return { x: 0, y: 0 };

            const rect = this.$refs.image.getBoundingClientRect();
            const scale = this.zoom / 100;

            const x = (event.clientX - rect.left) / scale;
            const y = (event.clientY - rect.top) / scale;

            return {
                x: Math.max(0, Math.min(x, this.displayWidth)),
                y: Math.max(0, Math.min(y, this.displayHeight)),
            };
        },

        displayToAbsoluteCoords(displayCoords) {
            if (!this.naturalWidth || !this.naturalHeight) return displayCoords;

            const scaleX = this.naturalWidth / this.displayWidth;
            const scaleY = this.naturalHeight / this.displayHeight;

            return {
                x: Math.round(displayCoords.x * scaleX),
                y: Math.round(displayCoords.y * scaleY),
                width: Math.round(displayCoords.width * scaleX),
                height: Math.round(displayCoords.height * scaleY),
            };
        },

        // 将图片原始尺寸的绝对坐标转换为显示坐标
        absoluteToDisplayCoords(absoluteCoords) {
            if (!this.naturalWidth || !this.naturalHeight) return absoluteCoords;

            const scaleX = this.displayWidth / this.naturalWidth;
            const scaleY = this.displayHeight / this.naturalHeight;

            return {
                x: absoluteCoords.x * scaleX,
                y: absoluteCoords.y * scaleY,
                width: absoluteCoords.width * scaleX,
                height: absoluteCoords.height * scaleY,
            };
        },

        // 处理视口变化
        handleViewportChange() {
            this.$nextTick(() => {
                if (this.$refs.image && this.imageLoaded) {
                    const oldWidth = this.displayWidth;
                    const oldHeight = this.displayHeight;

                    this.displayWidth = this.$refs.image.clientWidth;
                    this.displayHeight = this.$refs.image.clientHeight;

                    // 通知父组件图片尺寸变化
                    if (oldWidth > 0 && oldHeight > 0) {
                        this.$emit('image-resized', {
                            oldWidth,
                            oldHeight,
                            newWidth: this.displayWidth,
                            newHeight: this.displayHeight,
                        });
                    }
                }
            });
        },

        handleKeyDown(event) {
            // 如果在输入框中，不处理快捷键
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // 防止重复处理
            if (event.defaultPrevented) {
                return;
            }

            if (event.code === 'Space' && !event.repeat) {
                this.spacePressed = true;
                event.preventDefault();
            } else if (event.code === 'KeyC' && event.ctrlKey) {
                event.preventDefault();
                this.centerImage();
            } else if (event.code === 'KeyR' && event.ctrlKey) {
                event.preventDefault();
                this.resetView();
            } else if (
                event.code === 'ArrowLeft' &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey
            ) {
                // 左箭头：上一张图片
                event.preventDefault();
                this.goToPreviousFile();
            } else if (
                event.code === 'ArrowRight' &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey
            ) {
                // 右箭头：下一张图片
                event.preventDefault();
                this.goToNextFile();
            }
        },

        handleKeyUp(event) {
            if (event.code === 'Space') {
                this.spacePressed = false;
                if (this.isPanning) {
                    this.finishPan();
                }
            }
        },

        handleDocumentMouseMove(event) {
            if (this.isDrawing && this.$refs.image) {
                this.updateDrawingFromCanvas(event);
            }
        },

        handleDocumentMouseUp() {
            if (this.isDrawing) {
                this.finishDrawing();
            } else if (this.isPanning) {
                this.finishPan();
            } else if (this.isResizing) {
                this.finishResize();
            } else if (this.isMoving) {
                this.finishMove();
            }
        },

        handleImageLoad() {
            if (this.$refs.image) {
                this.naturalWidth = this.$refs.image.naturalWidth;
                this.naturalHeight = this.$refs.image.naturalHeight;
                this.displayWidth = this.$refs.image.clientWidth;
                this.displayHeight = this.$refs.image.clientHeight;
                this.imageLoaded = true;
                this.statusText = `图片已加载 • ${this.naturalWidth}×${this.naturalHeight} • 滚轮:屏幕中心缩放 • Shift/Ctrl+滚轮:平移 • Select模式悬停查看标签`;
                this.statusClass = 'loaded';

                // 通知父组件图片已加载并提供尺寸信息
                this.$emit('image-resized', {
                    oldWidth: 0,
                    oldHeight: 0,
                    newWidth: this.displayWidth,
                    newHeight: this.displayHeight,
                });
            }
        },

        handleImageError() {
            this.statusText = '图片加载失败';
            this.statusClass = 'error';
            this.$emit('message', {
                type: 'error',
                message: '图片加载失败，请检查图片格式或网络连接',
            });
        },

        handleAnnotationHover(annotationId, isEntering) {
            if (this.activeTool !== 'select') return;

            if (isEntering) {
                this.hoveredAnnotationId = annotationId;
            } else {
                this.hoveredAnnotationId = null;
            }
        },

        getHoverLabelStyle(annotation) {
            let top = -25;
            let left = 0;

            if (annotation.y < 30) {
                top = annotation.height + 5;
            }

            if (annotation.x + annotation.width > this.displayWidth - 100) {
                left = annotation.width - 80;
            }

            return {
                top: top + 'px',
                left: left + 'px',
            };
        },

        handleCanvasMouseMove(event) {
            const canvasRect = this.$refs.canvasArea.getBoundingClientRect();
            this.canvasMousePos = {
                x: event.clientX - canvasRect.left,
                y: event.clientY - canvasRect.top,
            };

            if (this.isPanning && this.panStartPos) {
                const deltaX = event.clientX - this.panStartPos.x;
                const deltaY = event.clientY - this.panStartPos.y;

                this.panX = this.panStartPos.panX + deltaX;
                this.panY = this.panStartPos.panY + deltaY;

                const maxPan = Math.max(1000, this.zoom * 3);
                this.panX = Math.max(-maxPan, Math.min(maxPan, this.panX));
                this.panY = Math.max(-maxPan, Math.min(maxPan, this.panY));

                return;
            }

            if (this.isDrawing && this.$refs.image) {
                this.updateDrawingFromCanvas(event);
            }

            if (this.activeTool === 'rectangle') {
                this.showGuidelines = true;
            }
        },

        handleCanvasMouseDown(event) {
            if (event.button === 1 || (event.button === 0 && this.spacePressed)) {
                event.preventDefault();
                this.startPan(event);
            }
        },

        handleCanvasMouseUp(event) {
            if (event.button === 1 && this.isPanning) {
                this.finishPan();
            }
        },

        startPan(event) {
            this.isPanning = true;
            this.panStartPos = {
                x: event.clientX,
                y: event.clientY,
                panX: this.panX,
                panY: this.panY,
            };
            document.body.style.cursor = 'grabbing';
        },

        finishPan() {
            this.isPanning = false;
            this.panStartPos = null;
            document.body.style.cursor = '';
        },

        handleCanvasMouseLeave() {
            this.showGuidelines = false;
            if (this.isPanning) {
                this.finishPan();
            }
        },

        handleAnnotationMouseDown(annotationId, event) {
            if (event.button !== 0 || this.activeTool !== 'select') return;

            event.stopPropagation();
            this.selectAnnotation(annotationId);

            if (!event.target.classList.contains('resize-handle')) {
                this.startMove(annotationId, event);
            }
        },

        handleAnnotationMouseMove(annotationId, event) {
            if (this.activeTool !== 'select' || this.selectedAnnotationId !== annotationId) return;

            const annotation = this.annotations.find(ann => ann.id === annotationId);
            if (!annotation) return;

            const rect = event.target.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const edgeThreshold = 8;
            const isNearLeft = mouseX <= edgeThreshold;
            const isNearRight = mouseX >= rect.width - edgeThreshold;
            const isNearTop = mouseY <= edgeThreshold;
            const isNearBottom = mouseY >= rect.height - edgeThreshold;

            if (isNearLeft && isNearTop) {
                this.currentCursor = 'nw-resize';
            } else if (isNearRight && isNearTop) {
                this.currentCursor = 'ne-resize';
            } else if (isNearLeft && isNearBottom) {
                this.currentCursor = 'sw-resize';
            } else if (isNearRight && isNearBottom) {
                this.currentCursor = 'se-resize';
            } else if (isNearLeft || isNearRight) {
                this.currentCursor = isNearLeft ? 'w-resize' : 'e-resize';
            } else if (isNearTop || isNearBottom) {
                this.currentCursor = isNearTop ? 'n-resize' : 's-resize';
            } else {
                this.currentCursor = 'move';
            }

            event.target.style.cursor = this.currentCursor;
        },

        startMove(annotationId, event) {
            this.isMoving = true;
            this.moveAnnotationId = annotationId;
            this.moveStartPos = this.getImageCoordinates(event);
        },

        updateMove() {
            if (!this.isMoving || !this.moveAnnotationId) return;

            const annotation = this.normalizedAnnotations.find(
                ann => ann.id === this.moveAnnotationId
            );
            if (!annotation) return;

            const deltaX = this.mousePos.x - this.moveStartPos.x;
            const deltaY = this.mousePos.y - this.moveStartPos.y;

            const newDisplayAnnotation = {
                ...annotation,
                x: Math.max(
                    0,
                    Math.min(annotation.x + deltaX, this.displayWidth - annotation.width)
                ),
                y: Math.max(
                    0,
                    Math.min(annotation.y + deltaY, this.displayHeight - annotation.height)
                ),
            };

            // 转换为图片原始尺寸的绝对坐标发送给App
            const absoluteAnnotation = this.displayToAbsoluteCoords(newDisplayAnnotation);
            this.$emit('annotation-updated', {
                ...annotation,
                x: absoluteAnnotation.x,
                y: absoluteAnnotation.y,
                width: absoluteAnnotation.width,
                height: absoluteAnnotation.height,
            });

            this.moveStartPos = { ...this.mousePos };
        },

        finishMove() {
            this.isMoving = false;
            this.moveAnnotationId = null;
            this.moveStartPos = null;
        },

        handleMouseDown(event) {
            if (event.button !== 0) return;

            if (!this.imageLoaded || this.isResizing) return;

            this.mousePos = this.getImageCoordinates(event);

            if (this.activeTool === 'rectangle') {
                this.startDrawing();
            } else if (this.activeTool === 'select') {
                this.$emit('annotation-selected', null);
            }
        },

        handleMouseMove(event) {
            if (!this.imageLoaded) return;

            this.mousePos = this.getImageCoordinates(event);

            if (this.isDrawing) {
                this.updateDrawing();
            } else if (this.isResizing) {
                this.updateResize();
            } else if (this.isMoving) {
                this.updateMove();
            }
        },

        handleMouseUp() {
            if (this.isDrawing) {
                this.finishDrawing();
            } else if (this.isResizing) {
                this.finishResize();
            } else if (this.isMoving) {
                this.finishMove();
            }
        },

        handleMouseLeave() {
            if (this.isResizing) {
                this.finishResize();
            } else if (this.isMoving) {
                this.finishMove();
            }
        },

        startDrawing() {
            this.isDrawing = true;
            this.startPoint = { ...this.mousePos };
            this.drawingAnnotation = {
                x: this.mousePos.x,
                y: this.mousePos.y,
                width: 0,
                height: 0,
            };
        },

        updateDrawing() {
            if (!this.isDrawing || !this.startPoint) return;

            const currentX = Math.max(0, Math.min(this.mousePos.x, this.displayWidth));
            const currentY = Math.max(0, Math.min(this.mousePos.y, this.displayHeight));
            const startX = Math.max(0, Math.min(this.startPoint.x, this.displayWidth));
            const startY = Math.max(0, Math.min(this.startPoint.y, this.displayHeight));

            this.drawingAnnotation = {
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                width: Math.abs(currentX - startX),
                height: Math.abs(currentY - startY),
            };
        },

        updateDrawingFromCanvas(event) {
            if (!this.isDrawing || !this.startPoint || !this.$refs.image) return;

            const rect = this.$refs.image.getBoundingClientRect();
            const rawX = (event.clientX - rect.left) / (this.zoom / 100);
            const rawY = (event.clientY - rect.top) / (this.zoom / 100);

            const currentX = Math.max(0, Math.min(rawX, this.displayWidth));
            const currentY = Math.max(0, Math.min(rawY, this.displayHeight));
            const startX = Math.max(0, Math.min(this.startPoint.x, this.displayWidth));
            const startY = Math.max(0, Math.min(this.startPoint.y, this.displayHeight));

            this.drawingAnnotation = {
                x: Math.min(startX, currentX),
                y: Math.min(startY, currentY),
                width: Math.abs(currentX - startX),
                height: Math.abs(currentY - startY),
            };
        },

        finishDrawing() {
            if (!this.isDrawing || !this.drawingAnnotation) return;

            if (this.drawingAnnotation.width > 5 && this.drawingAnnotation.height > 5) {
                const displayAnnotation = {
                    x: Math.max(0, this.drawingAnnotation.x),
                    y: Math.max(0, this.drawingAnnotation.y),
                    width: Math.min(
                        this.drawingAnnotation.width,
                        this.displayWidth - this.drawingAnnotation.x
                    ),
                    height: Math.min(
                        this.drawingAnnotation.height,
                        this.displayHeight - this.drawingAnnotation.y
                    ),
                };

                // 转换为图片原始尺寸的绝对坐标，并保留categoryId
                const absoluteAnnotation = this.displayToAbsoluteCoords(displayAnnotation);
                this.$emit('annotation-added', {
                    categoryId: this.selectedCategoryId,
                    ...absoluteAnnotation,
                });

                this.statusText = '标注添加成功';
                this.statusClass = 'success';

                setTimeout(() => {
                    this.statusText = `已加载: ${this.activeFile.name} • 切换到Select模式查看标签`;
                    this.statusClass = 'loaded';
                }, 2000);

                // this.$emit('message', { type: 'success', message: '标注添加成功' });
            } else {
                this.$emit('message', { type: 'warning', message: '标注框太小，请重新绘制' });
            }

            this.cancelDrawing();
        },

        cancelDrawing() {
            this.isDrawing = false;
            this.drawingAnnotation = null;
            this.startPoint = null;
        },

        selectAnnotation(annotationId) {
            this.$emit('annotation-selected', annotationId);
        },

        startResize(annotationId, handle, event) {
            if (event.button !== 0) return;

            event.stopPropagation();
            this.isResizing = true;
            this.resizeHandle = handle;
            this.resizeAnnotationId = annotationId;

            const rect = this.$refs.image.getBoundingClientRect();
            this.resizeStartPos = {
                x: (event.clientX - rect.left) / (this.zoom / 100),
                y: (event.clientY - rect.top) / (this.zoom / 100),
            };
        },

        updateResize() {
            if (!this.isResizing || !this.resizeAnnotationId) return;

            const annotation = this.normalizedAnnotations.find(
                ann => ann.id === this.resizeAnnotationId
            );
            if (!annotation) return;

            const originalLeft = annotation.x;
            const originalTop = annotation.y;
            const originalRight = annotation.x + annotation.width;
            const originalBottom = annotation.y + annotation.height;

            let newDisplayAnnotation = { ...annotation };

            if (this.resizeHandle.includes('n')) {
                newDisplayAnnotation.y = Math.min(this.mousePos.y, originalBottom - 10);
                newDisplayAnnotation.height = originalBottom - newDisplayAnnotation.y;
            }
            if (this.resizeHandle.includes('s')) {
                newDisplayAnnotation.height = Math.max(10, this.mousePos.y - originalTop);
            }
            if (this.resizeHandle.includes('w')) {
                newDisplayAnnotation.x = Math.min(this.mousePos.x, originalRight - 10);
                newDisplayAnnotation.width = originalRight - newDisplayAnnotation.x;
            }
            if (this.resizeHandle.includes('e')) {
                newDisplayAnnotation.width = Math.max(10, this.mousePos.x - originalLeft);
            }

            newDisplayAnnotation.x = Math.max(0, newDisplayAnnotation.x);
            newDisplayAnnotation.y = Math.max(0, newDisplayAnnotation.y);
            newDisplayAnnotation.width = Math.min(
                newDisplayAnnotation.width,
                this.displayWidth - newDisplayAnnotation.x
            );
            newDisplayAnnotation.height = Math.min(
                newDisplayAnnotation.height,
                this.displayHeight - newDisplayAnnotation.y
            );

            // 转换为图片原始尺寸的绝对坐标发送给App
            const absoluteAnnotation = this.displayToAbsoluteCoords(newDisplayAnnotation);
            this.$emit('annotation-updated', {
                ...annotation,
                x: absoluteAnnotation.x,
                y: absoluteAnnotation.y,
                width: absoluteAnnotation.width,
                height: absoluteAnnotation.height,
            });
        },

        finishResize() {
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeAnnotationId = null;
            this.resizeStartPos = null;
        },

        getAnnotationStyle(annotation) {
            const category = this.categories.find(cat => cat.id === annotation.categoryId);
            const borderColor = category ? category.color : '#64748b';

            return {
                left: annotation.x + 'px',
                top: annotation.y + 'px',
                width: annotation.width + 'px',
                height: annotation.height + 'px',
                borderColor: borderColor,
                backgroundColor: borderColor + '20',
            };
        },

        getDrawingStyle() {
            if (!this.drawingAnnotation) return {};

            const category = this.categories.find(cat => cat.id === this.selectedCategoryId);
            const borderColor = category ? category.color : '#64748b';

            return {
                left: this.drawingAnnotation.x + 'px',
                top: this.drawingAnnotation.y + 'px',
                width: this.drawingAnnotation.width + 'px',
                height: this.drawingAnnotation.height + 'px',
                borderColor: borderColor,
                backgroundColor: borderColor + '20',
            };
        },

        resetInteraction() {
            this.cancelDrawing();
            this.finishResize();
            this.finishMove();
            this.finishPan();
            this.isDragging = false;
            this.dragOffset = null;
            this.showGuidelines = false;
            this.currentCursor = 'default';
            this.hoveredAnnotationId = null;
        },

        resetView() {
            this.panX = 0;
            this.panY = 0;
            this.$emit('zoom-changed', 100);

            this.statusText = '视图已重置到100%';
            this.statusClass = 'success';

            setTimeout(() => {
                if (this.activeFile) {
                    this.statusText = `图片已加载 • ${this.naturalWidth}×${this.naturalHeight} • 滚轮:缩放 • Shift/Ctrl+滚轮:平移 • 双击/Ctrl+C:居中 • Ctrl+R:重置`;
                    this.statusClass = 'loaded';
                }
            }, 1500);
        },

        // 重置功能状态
        resetFeatureStates() {
            this.showAllLabels = false;
            this.highlightMode = false;
        },

        toggleShowAllLabels() {
            this.showAllLabels = !this.showAllLabels;
            // const status = this.showAllLabels ? '已显示' : '已隐藏';
            // this.$emit('message', {
            //     type: 'info',
            //     message: `${status}所有标注标签`,
            // });
        },

        toggleHighlightMode() {
            this.highlightMode = !this.highlightMode;
            // const status = this.highlightMode ? '已启用' : '已关闭';
            // this.$emit('message', {
            //     type: 'info',
            //     message: `${status}高亮模式`,
            // });
        },

        centerImage() {
            this.panX = 0;
            this.panY = 0;

            
            this.statusText = '图片已居中';
            this.statusClass = 'success';

            setTimeout(() => {
                if (this.activeFile) {
                    this.statusText = `图片已加载 • ${this.naturalWidth}×${this.naturalHeight} • 滚轮:缩放 • Shift/Ctrl+滚轮:平移 • 双击/Ctrl+C:居中 • Ctrl+R:重置`;
                    this.statusClass = 'loaded';
                }
            }, 1500);
        },

        handleWheel(event) {
            event.preventDefault();
            event.stopPropagation();

            if (!this.activeFile || !this.imageLoaded) return;

            const delta = -event.deltaY;

            if (event.ctrlKey) {
                const panSpeed = 50;
                this.panY += delta > 0 ? panSpeed : -panSpeed;
                const maxPanY = Math.max(2000, this.zoom * 5);
                this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
            } else if (event.shiftKey) {
                const panSpeed = 50;
                this.panX += delta > 0 ? panSpeed : -panSpeed;
                const maxPanX = Math.max(2000, this.zoom * 5);
                this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
            } else {
                const zoomSpeed = 15;
                const oldZoom = this.zoom;
                const newZoom = Math.max(
                    25,
                    Math.min(400, this.zoom + (delta > 0 ? zoomSpeed : -zoomSpeed))
                );

                if (newZoom !== oldZoom) {
                    const scaleChange = newZoom / oldZoom;
                    this.panX *= scaleChange;
                    this.panY *= scaleChange;

                    const maxPan = Math.max(2000, newZoom * 5);
                    this.panX = Math.max(-maxPan, Math.min(maxPan, this.panX));
                    this.panY = Math.max(-maxPan, Math.min(maxPan, this.panY));

                    this.$emit('zoom-changed', newZoom);
                }
            }
        },

        handleToolbarAction(action) {
            switch (action) {
                case 'delete':
                    if (this.selectedAnnotationId) {
                        if (confirm('确定要删除这个标注吗？')) {
                            this.$emit('annotation-deleted', this.selectedAnnotationId);
                            this.statusText = '标注已删除';
                            this.statusClass = 'success';
                            this.$emit('message', { type: 'success', message: '标注删除成功' });
                            setTimeout(() => {
                                this.statusText = `已加载: ${this.activeFile.name} • Select模式下悬停标注框查看标签`;
                                this.statusClass = 'loaded';
                            }, 2000);
                        }
                    }
                    break;
                case 'fit':
                    this.resetView();
                    break;
                case 'center':
                    this.centerImage();
                    break;
                case 'copy':
                    this.$emit('message', { type: 'info', message: '复制功能开发中...' });
                    break;
                case 'paste':
                    this.$emit('message', { type: 'info', message: '粘贴功能开发中...' });
                    break;
                case 'undo':
                    this.$emit('message', { type: 'info', message: '撤销功能开发中...' });
                    break;
                case 'redo':
                    this.$emit('message', { type: 'info', message: '重做功能开发中...' });
                    break;
                case 'fullscreen':
                    this.toggleFullscreen();
                    break;
                default:
                    break;
            }
        },

        toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {
                    this.$emit('message', { type: 'error', message: '无法进入全屏模式' });
                });
            } else {
                document.exitFullscreen().catch(() => {
                    this.$emit('message', { type: 'error', message: '无法退出全屏模式' });
                });
            }
        },
    },
};
</script>

<style scoped>
.main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    background: #f8fafc;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

.canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.canvas-area {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
        linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
        linear-gradient(-45deg, transparent 75%, #f1f5f9 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

.canvas-area.panning {
    cursor: grabbing !important;
}

.image-container {
    position: relative;
    display: inline-block;
    border-radius: 4px;
    overflow: visible;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    background: white;
    border: 1px solid #e2e8f0;
    cursor: crosshair;
    user-select: none;
    -webkit-user-drag: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    max-width: none;
    max-height: none;
}

.image-container[data-tool='select'] {
    cursor: default;
}

.annotation-image {
    display: block;
    max-width: 100%;
    max-height: 100%;
    user-select: none;
    pointer-events: none;
    -webkit-user-drag: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

.canvas-placeholder {
    width: 800px;
    height: 500px;
    background: #ffffff;
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 18px;
}

.placeholder-icon {
    font-size: 64px;
    margin-bottom: 20px;
    color: #94a3b8;
}

.placeholder-title {
    font-weight: 600;
    margin-bottom: 8px;
}

.placeholder-hint {
    font-size: 14px;
    color: #94a3b8;
}

.guidelines-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 100;
    overflow: hidden;
}

.guideline-vertical {
    position: absolute;
    top: 0;
    width: 1px;
    height: 100%;
    background: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 2px rgba(59, 130, 246, 0.4);
    /* transition: left 0.02s ease-out; */
}

.guideline-horizontal {
    position: absolute;
    left: 0;
    width: 100%;
    height: 1px;
    background: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 2px rgba(59, 130, 246, 0.4);
    /* transition: top 0.02s ease-out; */
}

.annotation-box {
    position: absolute;
    border: 2px solid #64748b;
    background: rgba(100, 116, 139, 0.1);
    pointer-events: auto;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    box-sizing: border-box;
}

.annotation-box.can-select {
    cursor: pointer;
    transition: all 0.15s ease;
}

.annotation-box.can-select:hover {
    border-width: 2px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
    background: rgba(100, 116, 139, 0.15);
}

.annotation-box.selected {
    border-width: 2px;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    background: rgba(59, 130, 246, 0.1);
    transition: none;
}

.annotation-box.drawing {
    pointer-events: none;
    border-style: dashed;
    transition: border-color 0.1s ease;
}

.annotation-label.hover-label {
    position: absolute;
    background: rgba(30, 41, 59, 0.95);
    color: white;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    backdrop-filter: blur(10px);
    pointer-events: none;
    z-index: 25;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    animation: fadeInLabel 0.2s ease-out;
}

.annotation-label.always-show-label {
    position: absolute;
    background: rgba(30, 41, 59, 0.9);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    z-index: 20;
    top: -22px;
    left: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* 高亮模式 - 使用SVG遮罩避免叠加问题 */
.highlight-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
}

.highlight-mask {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
}

.annotation-box.highlight-mode {
    z-index: 15;
    border-width: 3px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 4px 12px rgba(0, 0, 0, 0.3);
    background: transparent !important;
}

.resize-handles {
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    pointer-events: none;
}

.resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    pointer-events: auto;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.resize-handle:hover {
    background: #2563eb;
    transform: scale(1.2);
}

.resize-handle.nw {
    top: 0;
    left: 0;
    cursor: nw-resize;
}
.resize-handle.n {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    cursor: n-resize;
}
.resize-handle.ne {
    top: 0;
    right: 0;
    cursor: ne-resize;
}
.resize-handle.w {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    cursor: w-resize;
}
.resize-handle.e {
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    cursor: e-resize;
}
.resize-handle.sw {
    bottom: 0;
    left: 0;
    cursor: sw-resize;
}
.resize-handle.s {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    cursor: s-resize;
}
.resize-handle.se {
    bottom: 0;
    right: 0;
    cursor: se-resize;
}

.status-indicator {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    color: #334155;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
}

.status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
}

.status-dot.ready {
    background: #64748b;
}

.status-dot.loaded {
    background: #10b981;
}

.status-dot.drawing {
    background: #f59e0b;
    animation: pulse 1s ease-in-out infinite alternate;
}

.status-dot.success {
    background: #10b981;
    animation: successPulse 0.5s ease-in-out;
}

.status-dot.error {
    background: #dc2626;
}

@keyframes pulse {
    0% {
        opacity: 0.5;
    }
    100% {
        opacity: 1;
    }
}

@keyframes successPulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
}

@keyframes fadeInLabel {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 分类颜色样式 */
.annotation-box.category-0 {
    border-color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
}
.annotation-box.category-0.selected {
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.5);
    background: rgba(220, 38, 38, 0.15);
}
.annotation-box.category-1 {
    border-color: #2563eb;
    background: rgba(37, 99, 235, 0.1);
}
.annotation-box.category-1.selected {
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.5);
    background: rgba(37, 99, 235, 0.15);
}
.annotation-box.category-2 {
    border-color: #059669;
    background: rgba(5, 150, 105, 0.1);
}
.annotation-box.category-2.selected {
    box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.5);
    background: rgba(5, 150, 105, 0.15);
}
.annotation-box.category-3 {
    border-color: #d97706;
    background: rgba(217, 119, 6, 0.1);
}
.annotation-box.category-3.selected {
    box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.5);
    background: rgba(217, 119, 6, 0.15);
}
.annotation-box.category-4 {
    border-color: #7c3aed;
    background: rgba(124, 58, 237, 0.1);
}
.annotation-box.category-4.selected {
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.5);
    background: rgba(124, 58, 237, 0.15);
}

@media (max-width: 768px) {
    .canvas-placeholder {
        width: 100%;
        height: 300px;
    }

    .status-indicator {
        position: static;
        margin: 10px;
        text-align: center;
    }

    .resize-handle {
        width: 12px;
        height: 12px;
    }

    .guideline-vertical,
    .guideline-horizontal {
        width: 2px;
        height: 2px;
        background: rgba(59, 130, 246, 0.8);
        box-shadow: 0 0 3px rgba(59, 130, 246, 0.6);
    }

    .guideline-vertical {
        width: 2px;
        height: 100%;
    }

    .guideline-horizontal {
        width: 100%;
        height: 2px;
    }
}
</style>
