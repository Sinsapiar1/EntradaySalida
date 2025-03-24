/**
 * Sistema de envío de formularios con Google Apps Script
 */

// Variables globales
let uploadedImages = [];
const maxImageSize = 5 * 1024 * 1024; // 5MB (límite recomendado)
const maxImages = 10; // Máximo número de imágenes permitidas

// Inicializar la interfaz cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    setupImageUpload();
    setupFormSubmission();
});

// Configurar la carga de imágenes
function setupImageUpload() {
    const fileInput = document.getElementById('imageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const uploadButton = document.getElementById('uploadButton');
    
    if (!fileInput || !imagePreviewContainer || !uploadButton) return;
    
    // Evento de clic en el botón de subida
    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Evento de cambio en el input file
    fileInput.addEventListener('change', function(e) {
        handleImageFiles(e.target.files);
    });
    
    // Arrastrar y soltar
    imagePreviewContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        imagePreviewContainer.classList.add('dragover');
    });
    
    imagePreviewContainer.addEventListener('dragleave', function(e) {
        e.preventDefault();
        imagePreviewContainer.classList.remove('dragover');
    });
    
    imagePreviewContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        imagePreviewContainer.classList.remove('dragover');
        handleImageFiles(e.dataTransfer.files);
    });
}

// Procesar los archivos de imagen
function handleImageFiles(files) {
    if (!files || files.length === 0) return;
    
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    // Comprobar si se excede el número máximo de imágenes
    if (uploadedImages.length + files.length > maxImages) {
        showMessage(`Solo se permiten ${maxImages} imágenes como máximo.`, 'error');
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Comprobar si es una imagen
        if (!file.type.match('image.*')) {
            showMessage('Solo se permiten archivos de imagen.', 'error');
            continue;
        }
        
        // Comprobar el tamaño
        if (file.size > maxImageSize) {
            showMessage('Las imágenes no deben superar los 5MB de tamaño.', 'error');
            continue;
        }
        
        // Añadir a la lista de imágenes
        uploadedImages.push(file);
        
        // Crear vista previa
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', function() {
                const index = uploadedImages.indexOf(file);
                if (index > -1) {
                    uploadedImages.splice(index, 1);
                    previewItem.remove();
                }
            });
            
            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            imagePreviewContainer.appendChild(previewItem);
        };
        
        reader.readAsDataURL(file);
    }
}

// Configurar el envío del formulario
function setupFormSubmission() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!validateForm(form)) {
                return;
            }
            
            // Tipo de formulario
            const formType = form.getAttribute('data-form-type');
            
            // Mostrar indicador de carga
            showLoading(true);
            
            // Preparar datos del formulario
            const formData = new FormData(form);
            formData.append('tipoFormulario', formType);
            
            // Procesar imágenes
            processImagesForSubmission(formData).then(formDataWithImages => {
                // Enviar el formulario a Google Apps Script
                submitFormToGoogleScript(formDataWithImages);
            });
        });
    });
}

// Validar formulario
function validateForm(form) {
    const requiredInputs = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('invalid');
            isValid = false;
        } else {
            input.classList.remove('invalid');
        }
    });
    
    if (uploadedImages.length === 0) {
        showMessage('Debe adjuntar al menos una imagen.', 'error');
        isValid = false;
    }
    
    return isValid;
}

// Procesar imágenes para envío
async function processImagesForSubmission(formData) {
    for (let i = 0; i < uploadedImages.length; i++) {
        try {
            // Optimizar imagen
            const optimizedImage = await optimizeImage(uploadedImages[i]);
            const base64 = await convertImageToBase64(optimizedImage);
            formData.append(`imagen_${i}`, base64);
        } catch (error) {
            console.error('Error al procesar imagen:', error);
            // Usar imagen original si hay error
            const base64 = await convertImageToBase64(uploadedImages[i]);
            formData.append(`imagen_${i}`, base64);
        }
    }
    
    return formData;
}

// Optimizar imagen
async function optimizeImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            // Crear canvas para redimensionar
            const canvas = document.createElement('canvas');
            
            // Determinar tamaño máximo
            let width = img.width;
            let height = img.height;
            const maxSize = 1200;
            
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round(height * (maxSize / width));
                    width = maxSize;
                } else {
                    width = Math.round(width * (maxSize / height));
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Dibujar imagen redimensionada
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a blob
            canvas.toBlob(
                blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
                'image/jpeg',
                0.8
            );
        };
        
        img.onerror = function() {
            reject(new Error('Error al cargar la imagen para optimizar'));
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Convertir imagen a Base64
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Enviar formulario a Google Apps Script
// Enviar formulario a Google Apps Script
function submitFormToGoogleScript(formData) {
    // Mostrar mensaje de estado
    showMessage('Enviando formulario, por favor espere...', 'info');
    
    // Convertir FormData a objeto
    const formDataObject = {};
    formData.forEach((value, key) => {
        formDataObject[key] = value;
    });
    
    console.log('Enviando datos al servidor:', formDataObject);
    console.log('Número de imágenes siendo enviadas:', 
                Object.keys(formDataObject).filter(k => k.startsWith('imagen_')).length);
    
    // Enviar datos como JSON
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(formDataObject)
    })
    .then(response => {
        showLoading(false);
        console.log('Respuesta recibida del servidor');
        
        // Como es 'no-cors' no podemos leer la respuesta real
        showMessage('Formulario enviado correctamente. Recibirás un correo con la información.', 'success');
        
        // Limpiar formulario
        setTimeout(() => {
            document.querySelector('form').reset();
            uploadedImages = [];
            document.getElementById('imagePreviewContainer').innerHTML = '';
        }, 3000);
    })
    .catch(error => {
        showLoading(false);
        console.error('Error al enviar formulario:', error);
        showMessage('Error al enviar el formulario: ' + error.message, 'error');
    });
}

// Procesar imágenes para envío
async function processImagesForSubmission(formData) {
    console.log('Procesando imágenes para envío...');
    console.log('Número de imágenes a procesar:', uploadedImages.length);
    
    for (let i = 0; i < uploadedImages.length; i++) {
        try {
            console.log(`Procesando imagen ${i+1}/${uploadedImages.length}`);
            
            // Optimizar imagen
            const optimizedImage = await optimizeImage(uploadedImages[i]);
            console.log(`Imagen ${i+1} optimizada correctamente`);
            
            // Convertir a Base64
            const base64 = await convertImageToBase64(optimizedImage);
            console.log(`Imagen ${i+1} convertida a Base64 (longitud: ${base64.length})`);
            
            // Agregar a formData
            formData.append(`imagen_${i}`, base64);
        } catch (error) {
            console.error(`Error al procesar imagen ${i+1}:`, error);
            
            // Intentar con la imagen original
            try {
                const base64 = await convertImageToBase64(uploadedImages[i]);
                formData.append(`imagen_${i}`, base64);
                console.log(`Imagen ${i+1} fallback convertida a Base64`);
            } catch (fallbackError) {
                console.error(`Error también en fallback para imagen ${i+1}:`, fallbackError);
            }
        }
    }
    
    return formData;
}

// Mostrar/ocultar indicador de carga
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Mostrar mensaje de éxito o error
function showMessage(message, type = 'success') {
    const messageElement = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }
}