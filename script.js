document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const apiKeyInput = document.getElementById('api-key');
    const apiKeySection = document.getElementById('api-key-section');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const uploadContent = document.getElementById('upload-content');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImgBtn = document.getElementById('remove-img-btn');
    const generateBtn = document.getElementById('generate-btn');
    const resultArea = document.getElementById('result-area');
    const loadingState = document.getElementById('loading-state');
    const errorMsg = document.getElementById('error-msg');
    const promptResult = document.getElementById('prompt-result');
    const copyBtn = document.getElementById('copy-btn');

    // State
    let currentImageBase64 = null;
    let currentImageMimeType = null;
    const IS_LOCAL_DEVELOPMENT =
        location.protocol === 'file:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' ||
        location.hostname === '0.0.0.0';
    // Production: Gemini key lives in Cloudflare Pages (GEMINI_API_KEY); browser never sees it.
    const USE_SERVER_PROXY = !IS_LOCAL_DEVELOPMENT;

    // Gemini model aliases change over time; try multiple currently-available candidates.
    // If none work, we fall back to showing the last error.
    const MODEL_CANDIDATES = [
        // Prefer newer fast flash options first
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        // Generic alias (may or may not exist depending on the account/backend)
        'gemini-flash-latest'
    ];

    if (apiKeySection) apiKeySection.classList.toggle('hidden', USE_SERVER_PROXY);

    // Local dev: optional browser key (not used when deployed with server proxy).
    if (!USE_SERVER_PROXY) {
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            setKeySavedState();
        }
    }

    // Event Listeners
    saveKeyBtn.addEventListener('click', saveApiKey);
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveApiKey();
    });

    // File Input Logic
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Drag and Drop Logic
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    removeImgBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent trigger click on dropzone
        resetUploads();
    });

    generateBtn.addEventListener('click', generatePrompt);
    
    copyBtn.addEventListener('click', copyToClipboard);

    // Functions
    function saveApiKey() {
        if (USE_SERVER_PROXY) return;
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            setKeySavedState();
        }
    }

    function setKeySavedState() {
        saveKeyBtn.classList.add('success');
        saveKeyBtn.innerHTML = '<i class="fa-solid fa-check-double"></i>';
        setTimeout(() => {
            saveKeyBtn.classList.remove('success');
            saveKeyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        }, 2000);
    }

    function handleFileSelect(e) {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    }

    function handleFile(file) {
        if (!file.type.match('image.*')) {
            showError("Please upload an image file (JPG, PNG, WEBP).");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showError("File size must be less than 5MB.");
            return;
        }

        currentImageMimeType = file.type;

        const reader = new FileReader();
        reader.onload = (e) => {
            // e.target.result is a data URL like data:image/png;base64,...
            const fullDataUrl = e.target.result;
            imagePreview.src = fullDataUrl;
            
            // Extract just the base64 part for the API
            currentImageBase64 = fullDataUrl.split(',')[1];
            
            uploadContent.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            generateBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    function resetUploads() {
        fileInput.value = '';
        currentImageBase64 = null;
        currentImageMimeType = null;
        imagePreview.src = '';
        previewContainer.classList.add('hidden');
        uploadContent.classList.remove('hidden');
        generateBtn.disabled = true;
        resultArea.classList.add('hidden');
    }

    function showError(msg) {
        errorMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
        errorMsg.classList.remove('hidden');
        setTimeout(() => {
            errorMsg.classList.add('hidden');
        }, 5000);
    }

    async function generatePrompt() {
        const apiKey = apiKeyInput.value.trim();

        if (!currentImageBase64) {
            showError("Please upload an image first.");
            return;
        }

        if (!USE_SERVER_PROXY && !apiKey) {
            showError("Please enter your Google Gemini API Key first.");
            apiKeyInput.focus();
            return;
        }

        // Setup UI for loading
        generateBtn.disabled = true;
        resultArea.classList.remove('hidden');
        promptResult.classList.add('hidden');
        errorMsg.classList.add('hidden');
        loadingState.classList.remove('hidden');

        try {
            if (USE_SERVER_PROXY) {
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageBase64: currentImageBase64,
                        mimeType: currentImageMimeType
                    })
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to generate prompt');
                }

                if (data.prompt) {
                    promptResult.value = String(data.prompt);
                    loadingState.classList.add('hidden');
                    promptResult.classList.remove('hidden');
                    return;
                }

                throw new Error('Unexpected API response structure.');
            }

            let lastError = null;
            let generatedText = null;

            for (const model of MODEL_CANDIDATES) {
                // Using a multimodal "generateContent" REST endpoint.
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: "You are an expert AI prompt engineer for Midjourney and DALL-E. Analyze this image and describe it in extreme detail to create a perfect text-to-image prompt. Include details about the subject, pose, colors, lighting, style, camera angle, and mood. Format the final output as a comma-separated list of keywords and descriptive phrases, ready to be pasted into an image generator. Do not include introductory text, just the prompt itself."
                                        },
                                        {
                                            inline_data: {
                                                mime_type: currentImageMimeType,
                                                data: currentImageBase64
                                            }
                                        }
                                    ]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 800
                            }
                        })
                    }
                );

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const message = data.error?.message || '';
                    const isModelNotFound = response.status === 404;
                    const looksUnsupported =
                        /not\s*found|unrecognized|not\s*supported|unsupported|invalid\s*model/i.test(message);

                    if (isModelNotFound || looksUnsupported) {
                        lastError = new Error(message || `Model not usable: ${model}`);
                        continue;
                    }

                    throw new Error(message || 'Failed to generate prompt');
                }

                // Extract the generated text
                if (data.candidates && data.candidates[0].content.parts[0].text) {
                    generatedText = data.candidates[0].content.parts[0].text.trim();
                } else {
                    throw new Error('Unexpected API response structure.');
                }

                // If we got here, we succeeded.
                break;
            }

            if (!generatedText) {
                throw lastError || new Error('Failed to generate prompt with available models.');
            }

            promptResult.value = generatedText;
            loadingState.classList.add('hidden');
            promptResult.classList.remove('hidden');
        } catch (err) {
            loadingState.classList.add('hidden');
            showError(err.message || "An error occurred while communicating with the API.");
        } finally {
            generateBtn.disabled = false;
        }
    }

    function copyToClipboard() {
        if (!promptResult.value) return;

        navigator.clipboard.writeText(promptResult.value).then(() => {
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--success);"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showError('Failed to copy text to clipboard.');
        });
    }
});
