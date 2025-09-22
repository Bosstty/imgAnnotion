# 🖼️ 图片标注平台

一个基于浏览器的轻量级图片标注工具，支持在线标注、导出多种格式（YOLO / VOC / COCO）、压缩包打包，以及二次导入继续编辑。无需后端，直接运行即可使用。

## ✨ 功能特性

-   🚀 **纯前端工具**：基于浏览器运行，无需后端服务。
-   🖊️ **在线标注**：支持矩形框标注，快速构建数据集。
-   📦 **ZIP 导出**：可一键打包图片与标注文件。
-   🔄 **二次导入**：支持导入之前导出的 ZIP 文件，继续编辑。
-   📑 **多格式支持**：

    -   **YOLO / txt**
    -   **Pascal VOC / xml**
    -   **COCO / json**

## 🛠️ 安装与运行

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/image-annotation-platform.git
cd image-annotation-platform
```

### 2. 安装依赖

```bash
yarn install
```

### 3. 启动开发环境

```bash
yarn dev
```

打开浏览器访问：`http://localhost:3000`

### 4. 打包构建

```bash
yarn build
```

生成的静态文件在 `dist/` 目录下，可直接部署到静态服务器 。

## 📖 使用流程

1. 上传图片（支持多张）。
2. 在图片上绘制标注框，选择类别。
3. 保存后选择导出格式（YOLO / VOC / COCO）。
4. 系统会生成一个包含图片和标注的 ZIP 包。
5. 支持上传 ZIP 包继续修改。

## 📦 导出示例

```
dataset.zip
├── images/
│   ├── 0001.jpg
│   ├── 0002.jpg
│   └── ...
├── labels/              # YOLO 格式
│   ├── 0001.txt
│   ├── 0002.txt
│   └── ...
├── annotations.xml      # Pascal VOC 格式
└── annotations.json     # COCO 格式
```
