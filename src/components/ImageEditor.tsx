import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { saveAs } from 'file-saver';
import './ImageEditor.css';

const ImageEditor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: 'px',
    width: 0,
    height: 0,
    x: 0,
    y: 0
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true); // 默认锁定宽高比(保存时)
  const [cropAspectLock, setCropAspectLock] = useState<boolean>(false); // 新增：框选时的宽高比锁定
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false); // 新增：控制保存弹窗显示
  const [saveWidth, setSaveWidth] = useState<number>(0); // 新增：保存弹窗中的宽度
  const [saveHeight, setSaveHeight] = useState<number>(0); // 新增：保存弹窗中的高度
  const [showAspectWarning, setShowAspectWarning] = useState<boolean>(false); // 新增：宽高比解锁警告
  const [validationError, setValidationError] = useState<string>(''); // 新增：输入验证错误信息
  
  const imgRef = useRef<HTMLImageElement | null>(null);

  // 计算裁剪区域在原始图像中的真实像素位置和尺寸
  const getPixelCrop = (crop: PixelCrop, image: HTMLImageElement) => {
    // 注意：PixelCrop 已经是像素单位的裁剪数据，不需要判断 unit
    // 计算显示图像与原始图像的缩放比例
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    console.log('计算裁剪区域:', {
      crop,
      displaySize: { width: image.width, height: image.height },
      naturalSize: { width: image.naturalWidth, height: image.naturalHeight },
      scale: { x: scaleX, y: scaleY }
    });
    
    return {
      x: Math.round(crop.x * scaleX),
      y: Math.round(crop.y * scaleY),
      width: Math.round(crop.width * scaleX),
      height: Math.round(crop.height * scaleY)
    };
  };

  // 选择图片文件
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      
      // 创建图片URL
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
      
      // 重置裁剪设置
      setCrop({
        unit: 'px',
        width: 0,
        height: 0,
        x: 0,
        y: 0
      });
      
      // 清理之前的图片URL
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  };

  // 图片加载完成后的处理
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    
    // 使用图片的原始尺寸而非显示尺寸
    setOriginalWidth(img.naturalWidth);
    setOriginalHeight(img.naturalHeight);
    setWidth(img.naturalWidth);
    setHeight(img.naturalHeight);
    
    // 设置初始裁剪区域为整个图片
    setCrop({
      unit: 'px',
      width: img.width,
      height: img.height,
      x: 0,
      y: 0
    });
    
    console.log('图片加载完成:', {
      显示尺寸: { width: img.width, height: img.height },
      原始尺寸: { width: img.naturalWidth, height: img.naturalHeight }
    });
  };

  // 当图片加载时设置宽高比
  useEffect(() => {
    if (originalWidth && originalHeight) {
      setAspectRatio(originalWidth / originalHeight);
    }
  }, [originalWidth, originalHeight]);

  // 处理保存弹窗中的宽度变化
  const handleSaveWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 修复数字输入问题：先移除前导零，然后再转换为数字
    const value = e.target.value.replace(/^0+/, '');
    
    if (value === '') {
      setSaveWidth(0);
      setValidationError('宽度不能为空');
    } else {
      const newWidth = parseInt(value);
      setSaveWidth(newWidth);
      
      // 清除验证错误
      if (validationError === '宽度不能为空') {
        setValidationError('');
      }
      
      // 如果锁定宽高比，同时调整高度
      if (lockAspectRatio && completedCrop) {
        const cropAspectRatio = completedCrop.width / completedCrop.height;
        setSaveHeight(Math.round(newWidth / cropAspectRatio));
      }
    }
  };

  // 处理保存弹窗中的高度变化
  const handleSaveHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 修复数字输入问题：先移除前导零，然后再转换为数字
    const value = e.target.value.replace(/^0+/, '');
    
    if (value === '') {
      setSaveHeight(0);
      setValidationError('高度不能为空');
    } else {
      const newHeight = parseInt(value);
      setSaveHeight(newHeight);
      
      // 清除验证错误
      if (validationError === '高度不能为空') {
        setValidationError('');
      }
      
      // 如果锁定宽高比，同时调整宽度
      if (lockAspectRatio && completedCrop) {
        const cropAspectRatio = completedCrop.width / completedCrop.height;
        setSaveWidth(Math.round(newHeight * cropAspectRatio));
      }
    }
  };

  // 切换宽高比锁定
  const toggleAspectRatio = () => {
    const newLockState = !lockAspectRatio;
    setLockAspectRatio(newLockState);
    
    // 如果用户解除锁定，显示警告
    if (!newLockState) {
      setShowAspectWarning(true);
    } else {
      setShowAspectWarning(false);
      
      // 重新按照宽高比调整尺寸
      if (completedCrop) {
        const cropAspectRatio = completedCrop.width / completedCrop.height;
        setSaveHeight(Math.round(saveWidth / cropAspectRatio));
      }
    }
  };

  // 切换框选宽高比锁定
  const toggleCropAspectLock = () => {
    setCropAspectLock(!cropAspectLock);
  };

  // 打开保存对话框
  const openSaveDialog = () => {
    if (!completedCrop || !imgRef.current) {
      // 如果没有裁剪区域，使用原始图片尺寸
      setSaveWidth(originalWidth);
      setSaveHeight(originalHeight);
    } else {
      // 使用裁剪区域的实际像素尺寸
      const pixelCrop = getPixelCrop(completedCrop, imgRef.current);
      setSaveWidth(pixelCrop.width);
      setSaveHeight(pixelCrop.height);
    }
    
    setShowSaveDialog(true);
  };

  // 关闭保存对话框
  const closeSaveDialog = () => {
    setShowSaveDialog(false);
  };

  // 验证保存尺寸
  const validateSaveSize = (): boolean => {
    if (saveWidth <= 0) {
      setValidationError('宽度必须大于0');
      return false;
    }
    
    if (saveHeight <= 0) {
      setValidationError('高度必须大于0');
      return false;
    }
    
    return true;
  };

  // 保存编辑后的图片
  const saveImage = () => {
    // 验证尺寸
    if (!validateSaveSize()) {
      return;
    }
    
    if (!imgRef.current) return;

    setSaveStatus('保存中...');
    setShowSaveDialog(false);
    
    // 打印当前的状态用于调试
    console.log('保存图片:', {
      completedCrop,
      saveWidth,
      saveHeight,
      imgWidth: imgRef.current.width,
      imgHeight: imgRef.current.height,
      imgNaturalWidth: imgRef.current.naturalWidth,
      imgNaturalHeight: imgRef.current.naturalHeight
    });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setSaveStatus('保存失败: 无法创建画布上下文');
      return;
    }
    
    // 设置canvas尺寸为目标尺寸
    canvas.width = saveWidth;
    canvas.height = saveHeight;
    
    // 绘制白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, saveWidth, saveHeight);
    
    // 根据是否有裁剪区域决定绘制方式
    if (completedCrop && completedCrop.width && completedCrop.height) {
      // 获取在原始图像中的真实裁剪区域
      const pixelCrop = getPixelCrop(completedCrop, imgRef.current);
      console.log('保存时的真实裁剪区域:', pixelCrop); // 调试输出
      
      // 直接绘制裁剪区域到目标尺寸
      ctx.drawImage(
        imgRef.current,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        saveWidth,
        saveHeight
      );
    } else {
      // 当没有裁剪区域时，绘制整个图片
      ctx.drawImage(
        imgRef.current,
        0,
        0,
        imgRef.current.naturalWidth,
        imgRef.current.naturalHeight,
        0,
        0,
        saveWidth,
        saveHeight
      );
    }
    
    // 将canvas转换为blob并保存，明确指定图片格式和质量
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setSaveStatus('保存失败: 无法创建图片数据');
          console.error('Canvas toBlob failed');
          return;
        }
        
        // 使用原文件名，但添加尺寸信息和时间戳
        const fileExt = selectedFile ? selectedFile.name.split('.').pop() : 'png';
        const fileName = selectedFile ? 
          `${selectedFile.name.split('.')[0]}_${saveWidth}x${saveHeight}_${new Date().getTime()}.${fileExt}` : 
          `image_${saveWidth}x${saveHeight}_${new Date().getTime()}.png`;
        
        try {
          saveAs(blob, fileName);
          setSaveStatus('保存成功!');
          
          // 3秒后清除状态提示
          setTimeout(() => {
            setSaveStatus('');
          }, 3000);
        } catch (error) {
          setSaveStatus(`保存失败: ${error}`);
          console.error('Error saving file:', error);
        }
      },
      'image/png',
      0.95
    );
  };

  return (
    <div className="image-editor">
      <div className="upload-section">
        <label className="upload-button">
          选择图片
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input"
          />
        </label>
        {selectedFile && (
          <div className="file-info">
            <p>已选择: {selectedFile.name}</p>
            <p>原始尺寸: {originalWidth} x {originalHeight}px</p>
          </div>
        )}
      </div>
      
      {imageUrl && (
        <div className="editor-container">
          <div className="crop-container">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => {
                console.log('Completed crop:', c); // 调试裁剪信息
                setCompletedCrop(c);
                
                // 当裁剪完成后，更新内部状态中的裁剪区域尺寸
                if (c.width && c.height && imgRef.current) {
                  // 获取在原始图像中的裁剪区域真实像素尺寸
                  const pixelCrop = getPixelCrop(c, imgRef.current);
                  console.log('Pixel crop:', pixelCrop); // 调试真实像素尺寸
                  
                  // 更新内部状态
                  setWidth(pixelCrop.width);
                  setHeight(pixelCrop.height);
                }
              }}
              aspect={cropAspectLock ? aspectRatio : undefined}
              ruleOfThirds
            >
              <img
                src={imageUrl}
                onLoad={onImageLoad}
                alt="预览"
                className="preview-image"
              />
            </ReactCrop>
          </div>
          
          <div className="controls">
            <div className="crop-info">
              <h3>裁剪区域信息</h3>
              {completedCrop ? (
                <div className="info-details">
                  <p>裁剪尺寸: {width} x {height}px</p>
                </div>
              ) : (
                <p>请在图片上拖动鼠标进行裁剪</p>
              )}
              
              <div className="checkbox-group crop-lock-option">
                <input
                  type="checkbox"
                  id="crop-aspect-lock"
                  checked={cropAspectLock}
                  onChange={toggleCropAspectLock}
                />
                <label htmlFor="crop-aspect-lock">框选时锁定宽高比</label>
              </div>
            </div>
            
            <div className="save-section">
              <button className="save-button" onClick={openSaveDialog} disabled={!selectedFile}>
                保存图片
              </button>
              {saveStatus && <span className="save-status">{saveStatus}</span>}
            </div>
          </div>
        </div>
      )}
      
      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>设置输出尺寸</h3>
            
            <div className="dialog-content">
              <div className="input-group">
                <label>宽度 (px):</label>
                <input
                  type="number"
                  value={saveWidth === 0 ? '' : saveWidth}
                  onChange={handleSaveWidthChange}
                  min="1"
                />
              </div>
              
              <div className="input-group">
                <label>高度 (px):</label>
                <input
                  type="number"
                  value={saveHeight === 0 ? '' : saveHeight}
                  onChange={handleSaveHeightChange}
                  min="1"
                />
              </div>
              
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="aspect-ratio"
                  checked={lockAspectRatio}
                  onChange={toggleAspectRatio}
                />
                <label htmlFor="aspect-ratio">锁定宽高比</label>
              </div>
              
              {showAspectWarning && (
                <div className="aspect-warning">
                  <p>⚠️ 解除宽高比锁定可能导致图片变形</p>
                </div>
              )}
              
              {validationError && (
                <div className="validation-error">
                  <p>⚠️ {validationError}</p>
                </div>
              )}
            </div>
            
            <div className="dialog-buttons">
              <button className="cancel-button" onClick={closeSaveDialog}>
                取消
              </button>
              <button 
                className="confirm-button" 
                onClick={saveImage}
                disabled={saveWidth <= 0 || saveHeight <= 0}
              >
                确认并保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditor; 