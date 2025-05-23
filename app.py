from flask import Flask, request, jsonify, send_from_directory, render_template # Import render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import uuid # For generating unique filenames
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import functions from utils.py
from utils import detect_and_predict_instruments, get_ontology_info

app = Flask(__name__)
CORS(app)
# Configuration for upload and static directories
UPLOAD_FOLDER = 'uploads'
STATIC_FOLDER = 'static'
PREDICT_FOLDER = os.path.join(STATIC_FOLDER, 'predicts')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['STATIC_FOLDER'] = STATIC_FOLDER # Not directly used by Flask for serving but good for clarity
app.config['PREDICT_FOLDER'] = PREDICT_FOLDER

# Ensure upload and predict directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PREDICT_FOLDER'], exist_ok=True)


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/nhaccu')
def home():
    # Render the HTML templates for the home page
    return render_template('index.html')

@app.route('/nhaccu/detect_instrument', methods=['POST'])
def detect_instrument_api():
    if 'image_input' not in request.files:
        return jsonify({"error": "No image_input part in the request"}), 400

    file = request.files['image_input']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        # Generate a unique filename to prevent overwrites
        original_filename = secure_filename(file.filename)
        unique_filename = str(uuid.uuid4()) + os.path.splitext(original_filename)[1]
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)

        try:
            list_img_detected_paths, list_class_names = detect_and_predict_instruments(filepath)

            # Clean up the uploaded image after processing
            os.remove(filepath)

            # Retrieve ontology information for each detected class
            all_ontology_info = []
            for class_name in list_class_names:
                onto_info = get_ontology_info(class_name)
                if onto_info:
                    all_ontology_info.append({
                        "class_name": class_name,
                        "ontology_details": onto_info
                    })
                else:
                    all_ontology_info.append({
                        "class_name": class_name,
                        "ontology_details": "No ontology information found for this class."
                    })

            return jsonify({
                "list_img_detected": list_img_detected_paths,
                "list_class": list_class_names,
                "info_from_onto": all_ontology_info
            }), 200

        except FileNotFoundError as e:
            return jsonify({"error": f"File error: {e}"}), 500
        except RuntimeError as e:
            return jsonify({"error": f"Model or ontology loading error: {e}. Please check server logs."}), 500
        except Exception as e:
            # Catch any other unexpected errors
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
    else:
        return jsonify({"error": "File type not allowed"}), 400

# Serve static files (detected images)
@app.route('/static/predict/<path:filename>')
def serve_predicted_image(filename):
    return send_from_directory(app.config['PREDICT_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)