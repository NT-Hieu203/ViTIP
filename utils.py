import cv2
import numpy as np
import tensorflow as tf
from ultralytics import YOLO
from owlready2 import get_ontology
import random
import os
from numpy import argmax
# from tensorflow.keras.applications.resnet50 import preprocess_input
# Ensure your model paths are correct
# For better practice, these paths could be loaded from environment variables
YOLO_MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', 'models/model_yolo/best.pt')
LENET_MODEL_PATH = os.environ.get('LENET_MODEL_PATH', 'models/model_lenet/lenet_model30.h5')
ONTOLOGY_PATH = os.environ.get('ONTOLOGY_PATH', 'models/ontology/nhaccu.owl')
STATIC_PREDICT_DIR = os.environ.get('STATIC_PREDICT_DIR', 'static/predicts')

# Load models globally to avoid re-loading on each request
try:
    yolo_model = YOLO(YOLO_MODEL_PATH)
    lenet_model = tf.keras.models.load_model(LENET_MODEL_PATH)
    lenet_model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    ontology = get_ontology(ONTOLOGY_PATH).load()
except Exception as e:
    print(f"Error loading models or ontology: {e}")
    yolo_model = None
    lenet_model = None
    ontology = None

# Mapping for class names to ontology names
NHAC_CU_DT = {
    'cong_chieng': 'cồng_chiêng', 'dan_bau': 'đàn_bầu', 'dan_co': 'đàn_cò',
    'dan_da': 'đàn_đá', 'dan_day': 'đàn_đáy', 'dan_nguyet': 'đàn_nguyệt',
    'dan_sen': 'đàn_sến', 'dan_t_rung': 'đàn_t_rưng', 'dan_tinh': 'đàn_tính',
    'dan_tranh': 'đàn_tranh', 'dan_ty_ba': 'đàn_tỳ_bà', 'guitar': 'guitar',
    'khen': 'khèn', 'trong_quan': 'trống_quân'
}

# Mapping for ontology properties to display names
THUOC_TINH = {
    'có_cách_chơi_là': 'Có cách chơi là ', 'có_cấu_tạo_gồm': 'Có cấu tạo gồm ',
    'có_nguồn_gốc': 'Có nguồn gốc ', 'có_số_dây_là': 'Có số dây là ',
    'có_tác_giả_là': 'Có tác giả là ', 'có_tên_là': 'Có tên là ',
    'có_URL_là': 'Có URL là ', 'xuất_hiện_ở_Việt_Nam_vào': 'Xuất hiện ở Việt Nam vào',
    'được_biểu_diễn_bởi': 'Được biểu diễn bởi', 'được_sử_dụng_trong': 'Được sử dụng trong',
    'là_nhạc_cụ_đặc_trưng_ở': 'Là nhạc cụ đặc trưng ở',
    'được_dùng_rộng_rãi_trong_dân_tộc': 'Được sử dụng rộng rãi trong dân tộc'
}

CATEGORIES = [
    'cong_chieng', 'dan_bau', 'dan_co', 'dan_da', 'dan_day', 'dan_nguyet',
    'dan_sen', 'dan_t_rung', 'dan_tinh', 'dan_tranh', 'dan_ty_ba', 'guitar',
    'khen', 'trong_quan'
]


def predict_lenet(image_array: np.ndarray) -> str:
    """
    Predicts the class of an instrument image using the LeNet model.

    Args:
        image_array: A NumPy array representing the image (BGR format).

    Returns:
        The predicted class name as a string.
    """
    if lenet_model is None:
        raise RuntimeError("LeNet model not loaded. Check model path and loading errors.")

    img_input = cv2.resize(image_array, dsize=(64, 64))
    img_preprocessed = np.array(img_input, dtype="float") / 255.0

    img_preprocessed = np.expand_dims(img_preprocessed, axis=0)
    pred = lenet_model.predict(img_preprocessed, verbose=0)
    res = argmax(pred, axis=1)
    return CATEGORIES[res[0]]


def detect_and_predict_instruments(image_path: str):
    """
    Detects instruments in an image using YOLO, cuts them out,
    and predicts their class using LeNet.

    Args:
        image_path: The file path to the input image.

    Returns:
        A tuple containing:
        - list_img_paths: List of paths to the detected instrument images.
        - list_class_names: List of predicted class names for each detected instrument.
    """
    if yolo_model is None or lenet_model is None:
        raise RuntimeError("Detection or prediction models not loaded. Check model paths and loading errors.")

    img_input = cv2.imread(image_path)
    if img_input is None:
        raise FileNotFoundError(f"Image not found at {image_path}")

    rs = yolo_model.predict(source=img_input, verbose=False)  # suppress verbose output
    rs = rs[0]

    list_img_detected_paths = []
    class_out = []

    # Ensure the static/predict directory exists
    os.makedirs(STATIC_PREDICT_DIR, exist_ok=True)

    for i, ob in enumerate(rs.boxes):
        box = ob.xyxy[0].tolist()
        box = [round(x) for x in box]
        x1, y1, x2, y2 = box
        # conf = ob.conf[0].item() # Confidence is not used in the original logic but good to keep in mind

        img_cut = img_input[y1:y2, x1:x2]

        # Save the detected image
        detected_img_filename = f'image_{i:03d}.jpg'
        detected_img_full_path = os.path.join(STATIC_PREDICT_DIR, detected_img_filename)
        cv2.imwrite(detected_img_full_path, img_cut)
        list_img_detected_paths.append(f'/static/predict/{detected_img_filename}')  # Path for web serving

        # Predict class for the cut image
        # Convert to BGR if the original LeNet model was trained on BGR images, otherwise remove.
        # The original code did `cv2.cvtColor(listImg[t], cv2.COLOR_RGB2BGR)` before passing to predict_lenet.
        # However, cv2.imread reads as BGR by default, so if the cut image is directly passed,
        # it might already be in BGR. If your model expects RGB, you need to convert here.
        # Assuming the original model's training flow matches the `cv2.imread` then `cvtColor` sequence:
        img_for_lenet = cv2.cvtColor(img_cut, cv2.COLOR_BGR2RGB)  # If your LeNet model expects RGB
        # If your LeNet model expects BGR (as read by cv2.imread), then simply:
        # img_for_lenet = img_cut

        label = predict_lenet(img_for_lenet)
        class_out.append(label)

    return list_img_detected_paths, class_out


def get_ontology_info(one_class_name: str):
    """
    Retrieves information about an instrument from the ontology.

    Args:
        one_class_name: The predicted class name (e.g., 'dan_bau').

    Returns:
        A dictionary containing ontology information and related video details.
    """
    if ontology is None:
        raise RuntimeError("Ontology not loaded. Check ontology path and loading errors.")

    cl_n = NHAC_CU_DT.get(one_class_name)
    if not cl_n:
        return None  # Or raise an error, depending on desired behavior

    dict_onto_info = {}
    video_info = []  # Stores names of related videos/artworks

    # Get the ontology class instance using the dynamic name
    # Use getattr for safer access than eval for class instances
    instrument_class_instance = getattr(ontology, cl_n, None)

    if not instrument_class_instance:
        return None  # Instrument not found in ontology

    properties = instrument_class_instance.get_properties()
    values = instrument_class_instance

    for prop in properties:
        prop_name = prop.python_name
        display_prop_name = THUOC_TINH.get(prop_name, prop_name)  # Fallback to raw name if not in THUOC_TINH

        if prop_name == "được_sử_dụng_trong":
            nghethuat = set()
            for value in prop[values]:
                video_info.append(value.name)  # Add video/art work name
                try:
                    # Get parent of the artwork/performance for broader category
                    parent_names = [p.name for p in ontology.get_parents_of(value)]
                    if parent_names:
                        nghethuat.add(parent_names[0])
                except Exception as e:
                    print(f"Error getting parent for {value.name}: {e}")
            S = ', '.join(nghethuat)
            dict_onto_info[display_prop_name] = S.replace('_', ' ')
        elif prop_name in ["có_cấu_tạo_gồm", "được_dùng_rộng_rãi_trong_dân_tộc", "là_nhạc_cụ_đặc_trưng_ở"]:
            items = set()
            for value in prop[values]:
                items.add(value.name)
            S = ', '.join(items)
            dict_onto_info[display_prop_name] = S.replace('_', ' ')
        else:
            for value in prop[values]:
                try:
                    # Prefer name attribute if available, otherwise raw value
                    dict_onto_info[display_prop_name] = value.name
                except AttributeError:
                    dict_onto_info[display_prop_name] = value
                break  # Assuming single value for these properties

    list_dict_video_out = []
    # Select up to 3 random videos if available
    video_list_to_process = random.sample(video_info, min(len(video_info), 3)) if video_info else []

    for video_name in video_list_to_process:
        # Get the ontology instance for the video/artwork
        video_instance = getattr(ontology, video_name, None)
        if video_instance:
            video_dictionary = {}
            # Get properties of the video instance
            video_properties = video_instance.get_properties()
            for v_prop in video_properties:
                if v_prop.python_name != "được_sử_dụng_trong":  # Avoid circular reference
                    for v_value in v_prop[video_instance]:
                        display_v_prop_name = THUOC_TINH.get(v_prop.python_name, v_prop.python_name)
                        try:
                            video_dictionary[display_v_prop_name] = v_value.name
                        except AttributeError:
                            video_dictionary[display_v_prop_name] = v_value
                        break  # Take first value
            list_dict_video_out.append(video_dictionary)

    return {'ontology_info': dict_onto_info, 'videos': list_dict_video_out}