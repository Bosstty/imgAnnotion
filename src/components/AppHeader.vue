<!-- components/AppHeader.vue -->
<template>
    <div class="header">
        <div class="header-left">
            <span class="header-icon">🚢</span>
            <div class="header-text">
                <h1 class="header-title">智能标注平台</h1>
                <span class="header-subtitle">Smart Annotation System</span>
            </div>
        </div>

        <div class="header-center">
            <div class="project-info">
                <span class="project-label">当前项目:</span>
                <span class="project-name">港口设备检测训练集</span>
            </div>
        </div>

        <div class="header-right">
            <div class="version-info">
                <span class="version">v1.1.1</span>
            </div>

            <!-- 用户信息菜单 -->
            <div class="user-menu" @click="toggleUserMenu" ref="userMenu">
                <div class="user-avatar">👤</div>
                <span class="user-name" v-show="!isMobile">管理员</span>
                <div class="dropdown-arrow" :class="{ open: showUserMenu }">▼</div>

                <div class="user-dropdown" v-show="showUserMenu">
                    <div class="dropdown-item" @click="showSettings">
                        <span class="item-icon">⚙️</span>
                        系统设置
                    </div>
                    <div class="dropdown-item" @click="showShortcuts">
                        <span class="item-icon">⌨️</span>
                        快捷键说明
                    </div>
                    <div class="dropdown-item" @click="showAbout">
                        <span class="item-icon">ℹ️</span>
                        关于系统
                    </div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item" @click="logout">
                        <span class="item-icon">🚪</span>
                        退出登录
                    </div>
                </div>
            </div>
        </div>

        <!-- 系统设置对话框 -->
        <el-dialog
            title="系统设置"
            :visible.sync="showSettingsDialog"
            width="400px"
            :modal-z-index="2000"
            :z-index="2002"
            :append-to-body="true"
            :close-on-click-modal="true"
            center
            custom-class="centered-dialog"
        >
            <p>系统设置功能开发中...</p>
            <span slot="footer">
                <el-button type="primary" @click="showSettingsDialog = false">确定</el-button>
            </span>
        </el-dialog>

        <!-- 快捷键说明对话框 -->
        <el-dialog
            title="快捷键说明"
            :visible.sync="showShortcutsDialog"
            width="700px"
            :modal-z-index="2000"
            :z-index="2002"
            :append-to-body="true"
            :close-on-click-modal="true"
            center
            custom-class="centered-dialog"
        >
            <div class="shortcuts-content">
                <div class="shortcut-category">
                    <h4 class="category-title">图片操作</h4>
                    <div class="shortcut-grid">
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Ctrl</kbd>
                                +
                                <kbd>R</kbd>
                            </div>
                            <div class="shortcut-desc">重置图片位置</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">双击图片</div>
                            <div class="shortcut-desc">图片居中显示</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Ctrl</kbd>
                                + 滑动滚轮
                            </div>
                            <div class="shortcut-desc">上下平移图片</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Shift</kbd>
                                + 滑动滚轮
                            </div>
                            <div class="shortcut-desc">左右平移图片</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">滑动滚轮</div>
                            <div class="shortcut-desc">缩放图片</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">长按滚轮</div>
                            <div class="shortcut-desc">移动图片</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>←</kbd>
                            </div>
                            <div class="shortcut-desc">切换上一张图片</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>→</kbd>
                            </div>
                            <div class="shortcut-desc">切换下一张图片</div>
                        </div>
                    </div>
                </div>

                <!-- 面板操作 -->
                <div class="shortcut-category">
                    <h4 class="category-title">面板操作</h4>
                    <div class="shortcut-grid">
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Ctrl</kbd>
                                +
                                <kbd>1</kbd>
                            </div>
                            <div class="shortcut-desc">打开/关闭文件管理面板</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Ctrl</kbd>
                                +
                                <kbd>2</kbd>
                            </div>
                            <div class="shortcut-desc">打开/关闭标注管理面板</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Esc</kbd>
                            </div>
                            <div class="shortcut-desc">关闭所有面板</div>
                        </div>
                    </div>
                </div>

                <!-- 导航操作 -->
                <div class="shortcut-category">
                    <h4 class="category-title">导航操作</h4>
                    <div class="shortcut-grid">
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>F11</kbd>
                            </div>
                            <div class="shortcut-desc">进入/退出全屏</div>
                        </div>
                    </div>
                </div>

                <!-- 标注操作 -->
                <div class="shortcut-category">
                    <h4 class="category-title">标注操作</h4>
                    <div class="shortcut-grid">
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Ctrl</kbd>
                                +
                                <kbd>C</kbd>
                            </div>
                            <div class="shortcut-desc">复制标注框</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Ctrl</kbd>
                                +
                                <kbd>V</kbd>
                            </div>
                            <div class="shortcut-desc">粘贴标注框</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Ctrl</kbd>
                                +
                                <kbd>Z</kbd>
                            </div>
                            <div class="shortcut-desc">撤销操作</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>Ctrl</kbd>
                                +
                                <kbd>Shift</kbd>
                                +
                                <kbd>Z</kbd>
                            </div>
                            <div class="shortcut-desc">重做操作</div>
                        </div>
                        <div class="shortcut-item">
                            <div class="shortcut-keys">
                                <kbd>BackSpace</kbd>
                            </div>
                            <div class="shortcut-desc">删除选中标注框</div>
                        </div>
                    </div>
                </div>
            </div>

            <span slot="footer">
                <el-button type="primary" @click="showShortcutsDialog = false">知道了</el-button>
            </span>
        </el-dialog>

        <!-- 关于系统对话框 -->
        <el-dialog
            :visible.sync="showAboutDialog"
            width="600px"
            :modal-z-index="2000"
            :z-index="2002"
            :append-to-body="true"
            :close-on-click-modal="true"
            center
            custom-class="centered-dialog"
            margin-top="0px"
        >
            <div class="about-content">
                <!-- 系统信息 -->
                <div class="system-info">
                    <h3 class="system-title">智能标注平台</h3>
                    <p class="system-subtitle">Smart Annotation System</p>
                    <span class="version-tag">v2.1.0</span>
                </div>

                <!-- 系统介绍 -->
                <div class="intro-section">
                    <h4 class="section-title">系统介绍</h4>
                    <p class="intro-text">
                        智能标注平台是一款专业的图像标注工具，专为港口设备检测和监控而设计。
                        系统提供高效的标注工作流程，支持多种标注格式导出，助力港口智能化建设。
                    </p>

                    <div class="features">
                        <div class="feature-item">
                            <h5>智能图像处理</h5>
                            <p>支持多种图像格式，提供缩放、平移、旋转等操作</p>
                        </div>
                        <div class="feature-item">
                            <h5>精准标注框</h5>
                            <p>矩形标注框绘制，支持多类别分类管理</p>
                        </div>
                        <div class="feature-item">
                            <h5>多格式导出</h5>
                            <p>支持YOLO、COCO、VOC等主流标注格式</p>
                        </div>
                        <div class="feature-item">
                            <h5>高效工作流</h5>
                            <p>快捷键操作，批量处理，提升标注效率</p>
                        </div>
                    </div>
                </div>

                <!-- 技术栈 -->
                <div class="tech-section">
                    <h4 class="section-title">技术栈</h4>
                    <div class="tech-list">
                        <div class="tech-item">
                            <strong>Vue.js 2.6</strong>
                            <span>前端框架</span>
                        </div>
                        <div class="tech-item">
                            <strong>Element UI 2.15</strong>
                            <span>UI组件库</span>
                        </div>
                        <div class="tech-item">
                            <strong>HTML5 Canvas</strong>
                            <span>图像渲染</span>
                        </div>
                        <div class="tech-item">
                            <strong>JavaScript ES6+</strong>
                            <span>核心语言</span>
                        </div>
                    </div>
                </div>
            </div>

            <span slot="footer">
                <el-button type="primary" @click="showAboutDialog = false">关闭</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
export default {
    name: 'AppHeader',
    data() {
        return {
            showUserMenu: false,
            isMobile: false,
            showSettingsDialog: false,
            showShortcutsDialog: false,
            showAboutDialog: false,
        };
    },
    mounted() {
        this.checkMobile();
        window.addEventListener('resize', this.checkMobile);
        document.addEventListener('click', this.handleClickOutside);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.checkMobile);
        document.removeEventListener('click', this.handleClickOutside);
    },
    methods: {
        checkMobile() {
            this.isMobile = window.innerWidth <= 768;
        },

        toggleUserMenu() {
            this.showUserMenu = !this.showUserMenu;
        },

        handleClickOutside(event) {
            if (this.$refs.userMenu && !this.$refs.userMenu.contains(event.target)) {
                this.showUserMenu = false;
            }
        },

        showSettings() {
            this.showUserMenu = false;
            this.showSettingsDialog = true;
        },

        showShortcuts() {
            this.showUserMenu = false;
            this.showShortcutsDialog = true;
        },

        showAbout() {
            this.showUserMenu = false;
            this.showAboutDialog = true;
        },
        async logout() {
            this.showUserMenu = false;

            try {
                await this.$confirm('确定要退出系统吗？', '退出确认', {
                    confirmButtonText: '确定退出',
                    cancelButtonText: '取消',
                    type: 'warning',
                });

                this.performLogout();
            } catch {
                console.log('用户取消退出');
            }
        },

        performLogout() {
            try {
                sessionStorage.removeItem('isLoggedIn');
                sessionStorage.removeItem('username');

                // sessionStorage.clear();

                // 显示退出成功消息
                this.$message({
                    type: 'success',
                    message: '退出登录成功',
                });
                // 跳转到登录页面
                this.$router.push('/login');
            } catch (error) {
                console.error('退出登录时出现错误:', error);
                this.$message({
                    type: 'error',
                    message: '退出登录时出现错误，请重试',
                });
            }
        },
    },
};
</script>

<style scoped>
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
    display: flex;
    align-items: center;
    flex: 1;
}

.header-icon {
    font-size: 28px;
    margin-right: 12px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.header-text {
    display: flex;
    flex-direction: column;
}

.header-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.header-subtitle {
    font-size: 11px;
    color: #cbd5e1;
    font-weight: 400;
    opacity: 0.9;
}

.header-center {
    flex: 1;
    display: flex;
    justify-content: center;
}

.project-info {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    gap: 8px;
}

.project-label {
    font-size: 12px;
    color: #e2e8f0;
    opacity: 0.8;
}

.project-name {
    font-size: 13px;
    font-weight: 600;
    color: white;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 20px;
    flex: 1;
    justify-content: flex-end;
}

.version-info {
    font-size: 12px;
    color: #cbd5e1;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.version {
    font-weight: 500;
}

.user-menu {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 20px;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.user-menu:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
}

.user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
}

.user-name {
    font-size: 14px;
    font-weight: 500;
    color: white;
}

.dropdown-arrow {
    font-size: 10px;
    color: #cbd5e1;
    transition: transform 0.2s ease;
}

.dropdown-arrow.open {
    transform: rotate(180deg);
}

.user-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 180px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    border: 1px solid #e2e8f0;
    z-index: 9999;
    overflow: hidden;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
}

.dropdown-item:hover {
    background: #f8fafc;
    color: #1e293b;
}

.item-icon {
    font-size: 14px;
    width: 16px;
    text-align: center;
}

.dropdown-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 4px 0;
}

/* 响应式设计 */
@media (max-width: 1024px) {
    .header-center {
        display: none;
    }

    .header-left {
        flex: 2;
    }
}

@media (max-width: 768px) {
    .header {
        padding: 0 15px;
    }

    .header-title {
        font-size: 16px;
    }

    .header-subtitle {
        display: none;
    }

    .header-icon {
        font-size: 24px;
        margin-right: 8px;
    }

    .version-info {
        display: none;
    }

    .user-menu {
        padding: 4px 8px;
    }

    .user-avatar {
        width: 28px;
        height: 28px;
        font-size: 14px;
    }
}

@media (max-width: 480px) {
    .header {
        padding: 0 10px;
    }

    .header-title {
        font-size: 14px;
    }

    .header-icon {
        font-size: 20px;
        margin-right: 6px;
    }

    .header-right {
        gap: 10px;
    }

    .user-dropdown {
        right: -20px;
        min-width: 160px;
    }
}

/* 动画效果 */
.user-dropdown {
    animation: dropdownFadeIn 0.2s ease;
}

@keyframes dropdownFadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 暗色主题兼容 */
@media (prefers-color-scheme: dark) {
    .user-dropdown {
        background: #1e293b;
        border-color: #334155;
    }

    .dropdown-item {
        color: #e2e8f0;
    }

    .dropdown-item:hover {
        background: #334155;
        color: white;
    }

    .dropdown-divider {
        background: #334155;
    }
}
</style>

<style>
.el-dialog__wrapper {
    z-index: 2001 !important;
}

.centered-dialog {
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.centered-dialog .el-dialog {
    /* margin-top: 0 !important; */
}

.centered-dialog .el-dialog__body {
    padding: 24px !important;
    line-height: 1.6;
}

.centered-dialog .el-dialog__header {
    padding: 20px 24px 0 24px !important;
}

.centered-dialog .el-dialog__title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.centered-dialog .dialog-footer {
    padding: 20px 24px !important;
    border-top: 1px solid #f0f0f0;
    text-align: right;
    background: #fafafa;
}

/* 遮罩层样式调整 */
.v-modal {
    z-index: 2000 !important;
}

/* 快捷键样式 */
.shortcuts-content {
    max-height: 500px;
    overflow-y: auto;
}

.shortcut-category {
    margin-bottom: 32px;
}

.category-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
}

.shortcut-grid {
    display: grid;
    gap: 12px;
}

.shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
}

.shortcut-item:hover {
    background: #f1f3f4;
}

.shortcut-keys {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 13px;
}

.shortcut-keys kbd {
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    color: #374151;
    font-family: inherit;
    font-size: 11px;
    font-weight: 500;
    padding: 4px 6px;
    min-width: 20px;
    text-align: center;
}

.shortcut-desc {
    font-size: 14px;
    color: #666;
}

/* 关于系统样式 */
.about-content {
    line-height: 1.6;
}

.system-info {
    text-align: center;
    padding: 24px 0;
    border-bottom: 1px solid #eee;
    margin-bottom: 24px;
}

.system-title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0 0 4px 0;
}

.system-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0 0 12px 0;
}

.version-tag {
    display: inline-block;
    background: #e3f2fd;
    color: #1976d2;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.intro-section,
.tech-section {
    margin-bottom: 24px;
}

.section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
}

.intro-text {
    color: #555;
    margin-bottom: 20px;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
}

.feature-item {
    padding: 16px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
}

.feature-item h5 {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin: 0 0 6px 0;
}

.feature-item p {
    font-size: 13px;
    color: #666;
    margin: 0;
}

.tech-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.tech-item {
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 3px solid #1976d2;
}

.tech-item strong {
    font-size: 14px;
    color: #333;
    margin-bottom: 4px;
}

.tech-item span {
    font-size: 12px;
    color: #666;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .centered-dialog {
        margin: 60px 20px 20px 20px !important;
        width: calc(100% - 40px) !important;
        max-width: none !important;
    }

    .features {
        grid-template-columns: 1fr;
    }

    .tech-list {
        grid-template-columns: 1fr;
    }

    .shortcut-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
    .centered-dialog {
        margin: 40px 10px !important;
        width: calc(100% - 20px) !important;
    }

    .centered-dialog .el-dialog__body {
        padding: 16px !important;
    }

    .centered-dialog .el-dialog__header {
        padding: 16px 16px 0 16px !important;
    }
}
</style>
