const AWS = require('aws-sdk');
const path = require('path');
const S3 = new AWS.S3({ signatureVersion: 'v4' });
const BUCKET = process.env.BUCKET_NAME;
const REGION = process.env.AWS_REGION;

function getContentType(ext) {
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

exports.handler = async (event) => {
  try {
    const rawPath = event.rawPath || (event.requestContext && event.requestContext.http && event.requestContext.http.path) || '/';
    let subPath = rawPath;
    if (subPath.startsWith('/viewer')) {
      subPath = subPath.replace(/^\/viewer\/?/, '');
    } else {
      subPath = subPath.replace(/^\/?/, '');
    }

    // 1. 如果请求的是根路径，或者是 doc.html，渲染主页面
    if (!subPath || subPath === 'doc.html') {
      let docHtml = '';
      try {
        const data = await S3.getObject({ Bucket: BUCKET, Key: 'doc/doc.html' }).promise();
        docHtml = data.Body.toString('utf-8');
      } catch (err) {
        console.log('No custom doc found or error reading doc:', err.message);
        docHtml = '<div style="padding: 20px; color: #666;">暂无软件介绍说明。请在 release-doc 目录下上传 doc.html。</div>';
      }

      const host = event.headers?.host || event.requestContext?.domainName || '';
      const isCustom = host.includes('carrier.cytern.click');
      const downloadUrl = isCustom ? `https://${host}/release` : `https://${host}/viewer/release`;
      const baseHref = isCustom ? '/' : '/viewer/';

      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="${baseHref}"> <!-- 关键：保证相对路径图片能正确请求到当前 Lambda 的子路由 -->
    <title>Carrier Viewer 设备运维软件</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f4f6f8;
            margin: 0;
            padding: 0;
            color: #333;
        }
        .header {
            background-color: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            color: #222;
        }
        .header p {
            margin: 0 0 24px 0;
            color: #666;
            font-size: 16px;
        }
        .download-btn {
            display: inline-block;
            background-color: #07c160;
            color: #fff;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 24px;
            font-size: 16px;
            font-weight: bold;
            transition: background-color 0.2s;
            box-shadow: 0 4px 12px rgba(7,193,96,0.3);
        }
        .download-btn:hover {
            background-color: #06ad56;
        }
        .content {
            max-width: 800px;
            margin: 40px auto;
            background: #fff;
            padding: 32px;
            border-radius: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.04);
            line-height: 1.6;
            overflow-x: hidden;
        }
        /* 强制约束文档内图片最大宽度，防止撑破容器 */
        .content img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 10px auto;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .content img:hover {
            opacity: 0.9;
        }
        /* 图片查看器模态框样式 */
        .img-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.85);
            align-items: center;
            justify-content: center;
        }
        .img-modal.active {
            display: flex;
        }
        .img-modal img {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            cursor: zoom-out;
        }
        .img-modal-close {
            position: absolute;
            top: 20px;
            right: 30px;
            color: #fff;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
            user-select: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Carrier Viewer 设备运维软件</h1>
        <p>专业、安全的设备运维工具</p>
        <a href="${downloadUrl}" class="download-btn">立即下载</a>
    </div>
    <div class="content">
        ${docHtml}
    </div>

    <!-- 图片放大查看器 -->
    <div class="img-modal" id="imgModal">
        <span class="img-modal-close" id="imgModalClose">&times;</span>
        <img id="imgModalContent" src="" alt="放大图片">
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const modal = document.getElementById('imgModal');
            const modalImg = document.getElementById('imgModalContent');
            const closeBtn = document.getElementById('imgModalClose');
            
            // 为内容区的所有图片添加点击事件
            const images = document.querySelectorAll('.content img');
            images.forEach(img => {
                img.addEventListener('click', function() {
                    modal.classList.add('active');
                    modalImg.src = this.src;
                    document.body.style.overflow = 'hidden'; // 防止背景滚动
                });
            });

            // 点击关闭按钮关闭
            closeBtn.addEventListener('click', function() {
                closeModal();
            });

            // 点击背景关闭
            modal.addEventListener('click', function(e) {
                if (e.target === modal || e.target === modalImg) {
                    closeModal();
                }
            });

            // 按ESC键关闭
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    closeModal();
                }
            });

            function closeModal() {
                modal.classList.remove('active');
                document.body.style.overflow = ''; // 恢复滚动
            }
        });
    </script>
</body>
</html>`;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
        },
        body: html
      };
    }

    // 2. 如果请求的是其他静态资源（如图片），从 S3 读取并返回
    const s3Key = `doc/${subPath}`;
    try {
      const data = await S3.getObject({ Bucket: BUCKET, Key: s3Key }).promise();
      const ext = path.extname(subPath);
      const contentType = getContentType(ext);
      
      const isText = contentType.startsWith('text/') || contentType.startsWith('application/');
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400'
        },
        body: isText ? data.Body.toString('utf-8') : data.Body.toString('base64'),
        isBase64Encoded: !isText
      };
    } catch (err) {
      console.error(`Asset not found: ${s3Key}`, err.message);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Not Found'
      };
    }

  } catch (e) {
    console.error('Render page error', e && e.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: '<h1>500 Internal Server Error</h1>'
    };
  }
};