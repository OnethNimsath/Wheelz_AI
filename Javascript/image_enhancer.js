class ImageEnhancer {
    constructor() {
        this.selectedImages = [];
        this.enhancedImages = [];
        this.currentEnhancementType = 'sharpen';
        this.API_BASE_URL = 'http://localhost:5001'; // Python Flask API URL
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        this.modal = document.getElementById('imageEnhancerModal');
        this.enhancerBtn = document.getElementById('imageEnhancerBtn');
        this.closeBtn = document.getElementById('closeEnhancerModal');
        this.fileInput = document.getElementById('enhancerFileInput');
        this.selectBtn = document.getElementById('selectImagesBtn');
        this.enhanceBtn = document.getElementById('enhanceImagesBtn');
        this.useEnhancedBtn = document.getElementById('useEnhancedBtn');
        this.cancelBtn = document.getElementById('cancelEnhancerBtn');
        this.imageCount = document.getElementById('imageCount');
        this.enhancementOptions = document.getElementById('enhancementOptions');
        this.imageComparison = document.getElementById('imageComparison');
        this.originalImage = document.getElementById('originalImage');
        this.enhancedImage = document.getElementById('enhancedImage');
        this.processingOverlay = document.querySelector('.processing-overlay');
    }
    
    bindEvents() {
        this.enhancerBtn.addEventListener('click', () => this.openModal());
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.selectBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        this.enhanceBtn.addEventListener('click', () => this.enhanceImages());
        this.useEnhancedBtn.addEventListener('click', () => this.useEnhancedImages());

        document.querySelectorAll('.enhancement-option').forEach(option => {
            option.addEventListener('click', () => this.selectEnhancementType(option));
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }
    
    openModal() {
        this.modal.classList.add('active');
        this.resetModal();
    }
    
    closeModal() {
        this.modal.classList.remove('active');
        this.resetModal();
    }
    
    resetModal() {
        this.selectedImages = [];
        this.enhancedImages = [];
        this.updateImageCount();
        this.enhancementOptions.classList.add('hidden');
        this.imageComparison.classList.add('hidden');
        this.enhanceBtn.disabled = true;
        this.useEnhancedBtn.style.display = 'none';

        this.fileInput.value = '';

        this.originalImage.innerHTML = '<span class="text-gray-500">Original image will appear here</span>';
        this.enhancedImage.innerHTML = '<span class="text-gray-500">Enhanced image will appear here</span>';
    }
    
    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) return;
        
        // Validate file types
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const invalidFiles = files.filter(file => !validTypes.includes(file.type));
        
        if (invalidFiles.length > 0) {
            alert(`Please select only image files (JPEG, PNG, WebP). Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`);
            return;
        }
        
        // Validate file sizes (max 10MB per file)
        const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            alert(`File size must be less than 10MB. Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }
        
        this.selectedImages = files;
        
        if (files.length > 0) {
            this.updateImageCount();
            this.enhancementOptions.classList.remove('hidden');
            this.enhanceBtn.disabled = false;
            
            // Show preview of first image
            this.showImagePreview(files[0]);
        }
    }
    
    updateImageCount() {
        this.imageCount.textContent = `${this.selectedImages.length} image${this.selectedImages.length !== 1 ? 's' : ''} selected`;
    }
    
    showImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage.innerHTML = `<img src="${e.target.result}" alt="Original" class="max-w-full max-h-[300px] object-contain rounded">`;
            this.imageComparison.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
    
    selectEnhancementType(option) {
        document.querySelectorAll('.enhancement-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.currentEnhancementType = option.dataset.type;
    }
    
    async enhanceImages() {
        if (this.selectedImages.length === 0) return;
        
        this.enhanceBtn.disabled = true;
        this.enhanceBtn.textContent = 'Processing...';
        this.processingOverlay.classList.add('active');
        
        try {
            console.log(`Starting enhancement of ${this.selectedImages.length} images with type: ${this.currentEnhancementType}`);
            
            for (let i = 0; i < this.selectedImages.length; i++) {
                const file = this.selectedImages[i];
                console.log(`Processing image ${i + 1}/${this.selectedImages.length}: ${file.name}`);
                
                const enhancedBlob = await this.processImageEnhancement(file);
                this.enhancedImages.push({
                    original: file,
                    enhanced: enhancedBlob,
                    name: file.name
                });
                
                if (i === 0) {
                    this.showEnhancedPreview(enhancedBlob);
                }
                this.enhanceBtn.textContent = `Processing... ${i + 1}/${this.selectedImages.length}`;
            }
            
            this.processingOverlay.classList.remove('active');
            this.useEnhancedBtn.style.display = 'block';
            this.enhanceBtn.textContent = 'Enhancement Complete!';
            
            console.log('All images enhanced successfully');
            
        } catch (error) {
            console.error('Image enhancement failed:', error);
            this.processingOverlay.classList.remove('active');
            this.enhanceBtn.disabled = false;
            this.enhanceBtn.textContent = 'Enhance Images';
            this.enhancedImage.innerHTML = `
                <div class="text-center text-red-600">
                    <div class="text-2xl mb-2">⚠️</div>
                    <p>Enhancement failed</p>
                    <p class="text-sm">${error.message}</p>
                </div>
            `;
        }
    }
    
    async processImageEnhancement(file) {
        try {
            return await this.enhanceWithPythonAPI(file);
        } catch (error) {
            console.warn('Python API enhancement failed, using client-side processing:', error);
            return await this.clientSideEnhancement(file);
        }
    }
    
    async enhanceWithPythonAPI(file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('enhancement_type', this.currentEnhancementType);
        const enhancementParams = this.getEnhancementParameters();
        Object.keys(enhancementParams).forEach(key => {
            formData.append(key, enhancementParams[key]);
        });
        
        const response = await fetch(`${this.API_BASE_URL}/enhance-image`, {
            method: 'POST',
            body: formData,
            timeout: 30000 
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('Invalid response: expected image data');
        }
        
        return await response.blob();
    }
    
    getEnhancementParameters() {
        const params = {
            auto: { strength: 0.7, preserve_details: true },
            brightness: { brightness_factor: 1.2, preserve_highlights: true },
            sharpen: { strength: 1.5, radius: 1.0 },
            noise_reduction: { strength: 0.8, preserve_edges: true },
            color_correction: { saturation: 1.2, contrast: 1.1 },
            upscale: { scale_factor: 2, method: 'lanczos' }
        };
        
        return params[this.currentEnhancementType] || params.auto;
    }
    
    async clientSideEnhancement(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                switch (this.currentEnhancementType) {
                    case 'brightness':
                        this.adjustBrightness(imageData.data, 30);
                        break;
                    case 'sharpen':
                        this.applySharpen(imageData, ctx);
                        resolve();
                        return; // Sharpen handles its own canvas operations
                    case 'auto':
                        this.adjustBrightness(imageData.data, 15);
                        this.adjustContrast(imageData.data, 1.2);
                        break;
                    case 'color_correction':
                        this.adjustSaturation(imageData.data, 1.2);
                        this.adjustContrast(imageData.data, 1.1);
                        break;
                    case 'noise_reduction':
                        this.applyNoiseReduction(imageData, ctx);
                        resolve();
                        return;
                    case 'upscale':
                        this.applyUpscale(img, ctx, 1.5);
                        resolve();
                        return;
                    default:
                        this.adjustBrightness(imageData.data, 15);
                }
                
                ctx.putImageData(imageData, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    adjustBrightness(data, amount) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, data[i] + amount));     // Red
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount)); // Green
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount)); // Blue
        }
    }
    
    adjustContrast(data, factor) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
        }
    }
    
    adjustSaturation(data, factor) {
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = Math.min(255, Math.max(0, gray + factor * (data[i] - gray)));
            data[i + 1] = Math.min(255, Math.max(0, gray + factor * (data[i + 1] - gray)));
            data[i + 2] = Math.min(255, Math.max(0, gray + factor * (data[i + 2] - gray)));
        }
    }
    
    applySharpen(imageData, ctx) {
        const sharpenKernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        this.applyConvolution(imageData, ctx, sharpenKernel);
    }
    
    applyConvolution(imageData, ctx, kernel) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const newData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            const kernelIdx = (ky + 1) * 3 + (kx + 1);
                            sum += data[idx] * kernel[kernelIdx];
                        }
                    }
                    const idx = (y * width + x) * 4 + c;
                    newData[idx] = Math.min(255, Math.max(0, sum));
                }
            }
        }
        
        const newImageData = new ImageData(newData, width, height);
        ctx.putImageData(newImageData, 0, 0);
    }
    
    applyNoiseReduction(imageData, ctx) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const newData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    let count = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += data[idx];
                            count++;
                        }
                    }
                    
                    const idx = (y * width + x) * 4 + c;
                    newData[idx] = sum / count;
                }
            }
        }
        
        const newImageData = new ImageData(newData, width, height);
        ctx.putImageData(newImageData, 0, 0);
    }
    
    applyUpscale(img, ctx, scaleFactor) {
        const newWidth = Math.floor(img.width * scaleFactor);
        const newHeight = Math.floor(img.height * scaleFactor);
        ctx.canvas.width = newWidth;
        ctx.canvas.height = newHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
    }
    
    showEnhancedPreview(blob) {
        const url = URL.createObjectURL(blob);
        this.enhancedImage.innerHTML = `<img src="${url}" alt="Enhanced" class="max-w-full max-h-[300px] object-contain rounded">`;
    }
    
    useEnhancedImages() {
        const mainUploadArea = document.getElementById('mainUploadArea');
        const mainFileInput = mainUploadArea.querySelector('input[type="file"]');

        const dataTransfer = new DataTransfer();
        
        this.enhancedImages.forEach(item => {
            const enhancedFile = new File([item.enhanced], `enhanced_${item.name}`, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });
            dataTransfer.items.add(enhancedFile);
        });

        mainFileInput.files = dataTransfer.files;

        const fileList = this.enhancedImages.map(item => `enhanced_${item.name}`).join(', ');
        mainUploadArea.innerHTML = `
            <div class="text-gray-700">
                <svg class="mx-auto h-8 w-8 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <p class="text-sm font-medium">${this.enhancedImages.length} enhanced image${this.enhancedImages.length !== 1 ? 's' : ''} ready</p>
                <p class="text-xs text-gray-500">${fileList}</p>
                <p class="text-xs text-blue-600 mt-2">✨ Images enhanced with AI</p>
            </div>
            <input type="file" class="hidden" multiple accept="image/*">
        `;

        if (window.uploadedFiles) {
            window.uploadedFiles.vehiclePhotos = Array.from(dataTransfer.files);
        }
        
        this.closeModal();

        setTimeout(() => {
            alert(`Successfully enhanced ${this.enhancedImages.length} image${this.enhancedImages.length !== 1 ? 's' : ''}!`);
        }, 300);
    }
}

// Initialize Image Enhancer when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.imageEnhancer = new ImageEnhancer();
    console.log('Image Enhancer initialized');
});