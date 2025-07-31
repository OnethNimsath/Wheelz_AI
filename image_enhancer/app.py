from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from PIL import Image, ImageFilter, ImageEnhance # Import ImageEnhance
import io

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

@app.route('/enhance-image', methods=['POST'])
def enhance_image():
    """
    Receives an image as base64, enhances its quality (unblurring, sharpening, color, and optional filter),
    and returns the enhanced image as base64.
    Expected JSON payload:
    {
        "imageData": "base64_string",
        "mimeType": "image/jpeg",
        "enhance_colors": true,           # Boolean to apply color enhancement
        "apply_additional_filter": true,  # Boolean to apply an additional filter (e.g., DETAIL)
        "unblur_image": true              # New: Boolean to apply unblurring (Unsharp Mask)
    }
    """
    try:
        data = request.get_json()
        if not data or 'imageData' not in data or 'mimeType' not in data:
            return jsonify({"error": "Invalid request data. 'imageData' and 'mimeType' are required."}), 400

        image_data_base64 = data['imageData']
        mime_type = data['mimeType']
        enhance_colors = data.get('enhance_colors', False) # Default to False
        apply_additional_filter = data.get('apply_additional_filter', False) # Default to False
        unblur_image = data.get('unblur_image', False) # New: Default to False

        # Decode base64 image data
        # Ensure that the base64 string is clean (no 'data:image/png;base64,' prefix)
        if ',' in image_data_base64:
            image_data_base64 = image_data_base64.split(',')[1]
        
        image_bytes = base64.b64decode(image_data_base64)
        
        # Open image using Pillow
        img = Image.open(io.BytesIO(image_bytes))
        
        # Ensure image is in RGB mode for consistent color processing (remove alpha channel if present)
        if img.mode == 'RGBA':
            img = img.convert('RGB')

        # Start with the original image for enhancements
        enhanced_img = img
        
        # --- Image Quality Enhancement Logic ---
        # 1. Apply unblurring (Unsharp Mask) if requested - typically done first for clarity
        if unblur_image:
            # Unsharp Mask parameters:
            # radius: The radius of the Gaussian blur filter.
            # percent: The strength of the sharpening, as a percentage.
            # threshold: The minimum difference in pixel value that will be sharpened.
            enhanced_img = enhanced_img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
            print("Applied Unsharp Mask for deblurring.")

        # 2. Apply sharpening filter (from previous version)
        # This can be combined with or used instead of UnsharpMask depending on desired effect
        # If UnsharpMask is applied, basic sharpen might be redundant or too aggressive.
        # For this update, we'll keep it separate but note the interaction.
        enhanced_img = enhanced_img.filter(ImageFilter.SHARPEN)
        print("Applied Sharpen filter.")
        
        # 3. Improve colors if requested
        if enhance_colors:
            # Increase brightness slightly
            enhancer = ImageEnhance.Brightness(enhanced_img)
            enhanced_img = enhancer.enhance(1.1) # Increase brightness by 10%
            print("Increased brightness.")

            # Increase contrast slightly
            enhancer = ImageEnhance.Contrast(enhanced_img)
            enhanced_img = enhancer.enhance(1.1) # Increase contrast by 10%
            print("Increased contrast.")

            # Increase color saturation
            enhancer = ImageEnhance.Color(enhanced_img)
            enhanced_img = enhancer.enhance(1.2) # Increase saturation by 20%
            print("Increased saturation.")
        
        # 4. Apply additional filter if requested
        if apply_additional_filter:
            # Example: Apply a detail filter to bring out more fine details
            enhanced_img = enhanced_img.filter(ImageFilter.DETAIL)
            print("Applied Detail filter.")
            # You can experiment with other filters like ImageFilter.SMOOTH, ImageFilter.EDGE_ENHANCE, etc.
            # For de-blurring, more advanced techniques or ML models would be needed.
        
        # Convert enhanced image back to bytes
        buffered = io.BytesIO()
        # Save in the original format or a common format like PNG/JPEG
        # Ensure to handle transparency if original is PNG
        if 'png' in mime_type:
            enhanced_img.save(buffered, format="PNG")
        elif 'jpeg' in mime_type or 'jpg' in mime_type:
            # For JPEG, ensure RGB mode if image is RGBA (has alpha channel)
            if enhanced_img.mode == 'RGBA':
                enhanced_img = enhanced_img.convert('RGB')
            enhanced_img.save(buffered, format="JPEG", quality=90) # Save JPEG with quality
        else:
            # Default to PNG if mime type is unknown or unsupported for specific handling
            enhanced_img.save(buffered, format="PNG")

        enhanced_image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return jsonify({
            "enhancedImageData": enhanced_image_base64,
            "mimeType": mime_type # Return original mime type or updated if conversion happened
        }), 200

    except Exception as e:
        print(f"Error enhancing image: {e}")
        return jsonify({"error": f"Failed to enhance image: {str(e)}"}), 500

if __name__ == '__main__':
    # Ensure you run this Flask app on http://localhost:3000
    # The frontend is configured to send requests to this URL.
    app.run(host='0.0.0.0', port=3000, debug=True)