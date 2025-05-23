// Data mapping for 3D models (You need to adjust these paths)
// Bỏ trống nếu không có model 3D cho class đó
const MODEL_PATHS = {
    'cong_chieng': '/static/model_3D/cong_chieng/cong_chieng.gltf',
    'dan_bau': '/static/model_3D/dan_bau/dan_bau.gltf',
    'dan_co': '/static/model_3D/dan_co/dan_co.gltf',
    'dan_da': '/static/model_3D/dan_da/dan_da.gltf',
    'dan_day': '', // Ví dụ: Chưa có model cho Đàn đáy
    'dan_nguyet': '/static/model_3D/dan_nguyet/dan_nguyet.gltf',
    'dan_sen': '/static/model_3D/dan_sen/dan_sen.gltf',
    'dan_t_rung': '', // Ví dụ: Chưa có model cho Đàn T'rưng
    'dan_tinh': '', // Ví dụ: Chưa có model cho Đàn Tính
    'dan_tranh': '/static/model_3D/dan_tranh/dan_tranh.gltf',
    'dan_ty_ba': '/static/model_3D/dan_ty_ba/dan_ty_ba.gltf',
    'guitar': '',
    'khen': '',
    'trong_quan': '/static/model_3D/trong_quan/trong_quan.gltf',
    // Add more mappings as needed
};

const imageInput = document.getElementById('imageInput');
const uploadButton = document.getElementById('uploadButton');
const fileNameSpan = document.getElementById('fileName');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const resultsSection = document.getElementById('resultsSection');
const resultsHeading = document.getElementById('resultsHeading');
const noResultsMessage = document.getElementById('noResultsMessage');

let selectedFile = null;

imageInput.addEventListener('change', (event) => {
    selectedFile = event.target.files[0];
    if (selectedFile) {
        fileNameSpan.textContent = `File đã chọn: ${selectedFile.name}`;
        errorMessage.style.display = 'none';
    } else {
        fileNameSpan.textContent = 'Chưa có ảnh được chọn.';
    }
});

uploadButton.addEventListener('click', async () => {
    if (!selectedFile) {
        errorMessage.textContent = 'Vui lòng chọn một ảnh để tải lên.';
        errorMessage.style.display = 'block';
        return;
    }

    // Clear previous results
    resultsSection.innerHTML = ''; // Clear all content inside resultsSection
    resultsSection.appendChild(resultsHeading); // Re-add the heading
    resultsSection.appendChild(noResultsMessage); // Re-add the initial message
    resultsHeading.style.display = 'none';
    noResultsMessage.textContent = 'Đang xử lý ảnh... Vui lòng chờ.';
    noResultsMessage.style.display = 'block'; // Show processing message

    errorMessage.style.display = 'none';
    loadingMessage.style.display = 'block'; // Show loading message

    const formData = new FormData();
    formData.append('image_input', selectedFile);

    try {
        const response = await fetch('/nhaccu/detect_instrument', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data);

        loadingMessage.style.display = 'none'; // Hide loading message
        noResultsMessage.style.display = 'none'; // Hide "processing" message

        if (data.info_from_onto && data.info_from_onto.length > 0) {
            resultsHeading.style.display = 'block'; // Show results heading
            data.info_from_onto.forEach((instrument, index) => {
                // Create instrument card
                const instrumentCard = document.createElement('div');
                instrumentCard.classList.add('instrument-card');

                // 1. Tên nhạc cụ (Heading)
                const heading = document.createElement('h3');
                heading.textContent = instrument.class_name.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                instrumentCard.appendChild(heading);

                // 2. Ảnh đã phát hiện
                const img = document.createElement('img');
                img.classList.add('detected-image');
                img.src = data.list_img_detected[index]; // Assuming order matches
                img.alt = instrument.class_name;
                instrumentCard.appendChild(img);

                // 3. 3D Model Container
                const model3dContainer = document.createElement('div');
                model3dContainer.classList.add('model3d-container');
                const model3dDiv = document.createElement('div');
                model3dDiv.classList.add('model3d');
                model3dDiv.id = `model3D-${instrument.class_name}-${index}`; // Unique ID for each model
                model3dContainer.appendChild(model3dDiv);
                instrumentCard.appendChild(model3dContainer);

                // 4. Thông tin Ontology
                const ontologyInfoDiv = document.createElement('div');
                ontologyInfoDiv.classList.add('ontology-infor');
                const infoHeading = document.createElement('p');
                infoHeading.style.marginBottom = '5px';
                infoHeading.style.fontSize = '18px';
                infoHeading.innerHTML = '<b>Thông tin đàn:</b>';
                ontologyInfoDiv.appendChild(infoHeading);

                if (instrument.ontology_details && instrument.ontology_details.ontology_info) {
                    const ul = document.createElement('ul');
                    ul.style.marginLeft = '20px';
                    for (const [key, value] of Object.entries(instrument.ontology_details.ontology_info)) {
                        const li = document.createElement('li');
                        li.innerHTML = `<b>- ${key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:</b> ${value}`;
                        ul.appendChild(li);
                    }
                    ontologyInfoDiv.appendChild(ul);
                } else {
                    const p = document.createElement('p');
                    p.textContent = 'Không có thông tin ontology chi tiết.';
                    ontologyInfoDiv.appendChild(p);
                }
                instrumentCard.appendChild(ontologyInfoDiv);

                // 5. Các loại hình nghệ thuật (Videos)
                const videoSectionP = document.createElement('p');
                videoSectionP.style.marginBottom = '20px';
                videoSectionP.style.fontSize = '18px';
                videoSectionP.innerHTML = '<b>Các loại hình nghệ thuật</b>';
                instrumentCard.appendChild(videoSectionP);

                const ontologyVideoSection = document.createElement('div');
                ontologyVideoSection.classList.add('ontology-video-section');

                if (instrument.ontology_details && instrument.ontology_details.videos && instrument.ontology_details.videos.length > 0) {
                    const videoGrid = document.createElement('div');
                    videoGrid.classList.add('ontology-video-grid');
                    instrument.ontology_details.videos.forEach(video => {
                        const videoItemDiv = document.createElement('div');
                        videoItemDiv.classList.add('ontology-video-item');

                        if (video['Có URL là ']) {
                            const videoContainer = document.createElement('div');
                            videoContainer.classList.add('video-container');
                            const iframe = document.createElement('iframe');
                            iframe.src = getEmbedUrl(video['Có URL là ']);
                            iframe.frameborder = "0";
                            iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
                            iframe.allowFullscreen = true;
                            videoContainer.appendChild(iframe);
                            videoItemDiv.appendChild(videoContainer);
                        }

                        // Display other video info, excluding the URL
                        for (const [vKey, vValue] of Object.entries(video)) {
                            if (vKey !== 'Có URL là ') {
                                const p = document.createElement('p');
                                p.innerHTML = `<b>- ${vKey.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:</b> ${vValue}`;
                                videoItemDiv.appendChild(p);
                            }
                        }
                        videoGrid.appendChild(videoItemDiv);
                    });
                    ontologyVideoSection.appendChild(videoGrid);
                } else {
                    const noVideoP = document.createElement('p');
                    noVideoP.textContent = 'Không có video liên quan.';
                    ontologyVideoSection.appendChild(noVideoP);
                }
                instrumentCard.appendChild(ontologyVideoSection);

                resultsSection.appendChild(instrumentCard);

                // Initialize 3D model after adding to DOM
                initScene(model3dDiv, instrument.class_name);
            });
        } else {
            noResultsMessage.textContent = 'Không tìm thấy nhạc cụ nào trong ảnh hoặc không có thông tin.';
            noResultsMessage.style.display = 'block';
        }

    } catch (error) {
        loadingMessage.style.display = 'none';
        errorMessage.textContent = `Lỗi: ${error.message}`;
        errorMessage.style.display = 'block';
        console.error('Error during fetch:', error);
        noResultsMessage.textContent = ''; // Clear previous message
    }
});

// Function to extract YouTube embed URL
function getEmbedUrl(url) {
    let videoId = '';
    // Standard YouTube URL regex
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
        videoId = match[1];
    } else {
        // Fallback for custom Googleusercontent format if it contains a YouTube ID
        // Example: 'youtu.be/-jY-x5-aBc?param=value' -> ID: -jY-x5-aBc
        const googleUserContentMatch = url.match(/googleusercontent\.com\/youtube\.com\/\d+([a-zA-Z0-9_-]+)(?:\?.*)?$/);
        if (googleUserContentMatch && googleUserContentMatch[1]) {
            videoId = googleUserContentMatch[1];
        }
    }

    if (videoId) {
        // Return standard YouTube embed URL
        return `https://www.youtube.com/embed/${videoId}`;
    }
    return ''; // Return empty string if no valid ID found
}

// Function to initialize Three.js scene for a given container and class name
function initScene(containerElement, className) {
    const modelPath = MODEL_PATHS[className];

    if (!modelPath) {
        containerElement.innerHTML = '<p>Không có mô hình 3D cho nhạc cụ này.</p>';
        return;
    }

    // Check if Three.js modules are loaded
    if (!window.THREE || !window.OrbitControls || !window.GLTFLoader) {
        console.error("Three.js modules not loaded yet!");
        containerElement.innerHTML = '<p>Lỗi: Thư viện 3D chưa tải xong.</p>';
        return;
    }

    const scene = new window.THREE.Scene();
    scene.background = null; // Makes the background transparent

    const camera = new window.THREE.PerspectiveCamera(
        75,
        containerElement.clientWidth / containerElement.clientHeight,
        0.1,
        1000
    );

    const renderer = new window.THREE.WebGLRenderer({ alpha: true, antialias: true }); // Antialiasing for smoother edges
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
    renderer.toneMapping = window.THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    containerElement.innerHTML = ''; // Clear existing content
    containerElement.appendChild(renderer.domElement);

    const controls = new window.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 2; // Allow closer zoom
    controls.maxDistance = 15; // Allow further zoom
    controls.maxPolarAngle = Math.PI / 2;

    let object; // To hold the loaded 3D model

    const loader = new window.GLTFLoader();
    loader.load(
        modelPath,
        (gltf) => {
            object = gltf.scene;
            scene.add(object);

            // Calculate bounding box to center and scale the model
            const box = new window.THREE.Box3().setFromObject(object);
            const center = box.getCenter(new window.THREE.Vector3());
            object.position.sub(center); // Center the object

            // Adjust camera to fit the model
            const size = box.getSize(new window.THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            camera.position.z = Math.max(cameraZ * 1.5, controls.minDistance);
            controls.target.copy(center); // Set orbit controls target to the model's center
            controls.update();
        },
        undefined, // Progress callback
        (error) => {
            console.error(`Error loading 3D model for ${className}:`, error);
            containerElement.innerHTML = `<p>Không thể tải mô hình 3D cho ${className}.</p>`;
        }
    );

    // Add Lights - Cải thiện ánh sáng
    // 1. Ánh sáng môi trường (Ambient Light)
    const ambientLight = new window.THREE.AmbientLight(0xffffff, 1.2); // Tăng cường độ
    scene.add(ambientLight);

    // 2. Đèn định hướng (Directional Light) - Đèn chính
    const directionalLight1 = new window.THREE.DirectionalLight(0xffffff, 2.5); // Mạnh hơn
    directionalLight1.position.set(5, 5, 5).normalize(); // Từ phía trên, phải, phía trước
    scene.add(directionalLight1);

    // 3. Đèn định hướng khác (Directional Light) - Đèn phụ
    const directionalLight2 = new window.THREE.DirectionalLight(0xffffff, 1.5); // Đèn phụ
    directionalLight2.position.set(-5, -5, -5).normalize(); // Từ phía dưới, trái, phía sau
    scene.add(directionalLight2);

    // 4. Một vài đèn điểm (Point Light) nhỏ để tạo highlight hoặc làm sáng các chi tiết
    const pointLight1 = new window.THREE.PointLight(0xffffff, 0.5, 100);
    pointLight1.position.set(3, 3, 3);
    scene.add(pointLight1);

    const pointLight2 = new window.THREE.PointLight(0xffffff, 0.5, 100);
    pointLight2.position.set(-3, -3, -3);
    scene.add(pointLight2);

    // Render loop
    const animate = () => {
        requestAnimationFrame(animate);
        if (object) {
            object.rotation.y += 0.005; // Tốc độ xoay nhẹ hơn
        }
        controls.update();
        renderer.render(scene, camera);
    };

    // Handle resize - Đảm bảo responsive
    const onWindowResize = () => {
        camera.aspect = containerElement.clientWidth / containerElement.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerElement.clientWidth, containerElement.clientHeight);
    };
    window.addEventListener('resize', onWindowResize); // Add global listener

    animate();
}