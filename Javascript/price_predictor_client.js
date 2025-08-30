class VehiclePricePredictionClient {
    constructor(apiBaseUrl = 'http://localhost:5000') {
        this.apiBaseUrl = apiBaseUrl;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.apiBaseUrl}${endpoint}`;
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async checkHealth() {
        try {
            const response = await this.makeRequest('/health');
            return response.model_loaded;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    async predictPrice(vehicleData) {
        try {
            // Validate required fields
            const requiredFields = ['make', 'model', 'year', 'mileage', 'fuel_type', 'body_type', 'condition'];
            const missingFields = requiredFields.filter(field => !vehicleData[field]);
            
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Validate data types and ranges
            this.validateVehicleData(vehicleData);

            const response = await this.makeRequest('/predict-price', {
                method: 'POST',
                body: JSON.stringify(vehicleData)
            });

            return response;
        } catch (error) {
            console.error('Price prediction failed:', error);
            throw error;
        }
    }

    validateVehicleData(data) {
        const currentYear = new Date().getFullYear();
        
        // Validate year
        if (data.year < 1990 || data.year > currentYear + 1) {
            throw new Error(`Year must be between 1990 and ${currentYear + 1}`);
        }

        // Validate mileage
        if (data.mileage < 0 || data.mileage > 1000000) {
            throw new Error('Mileage must be between 0 and 1,000,000 km');
        }

        // Validate numeric fields
        if (!Number.isInteger(data.year) || !Number.isInteger(data.mileage)) {
            throw new Error('Year and mileage must be integers');
        }
    }

    async getMakes() {
        const cacheKey = 'makes';
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }
        }

        try {
            const response = await this.makeRequest('/get-makes');
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: response.makes,
                timestamp: Date.now()
            });

            return response.makes;
        } catch (error) {
            console.error('Failed to get makes:', error);
            return [];
        }
    }

    async getModels(make) {
        if (!make) {
            return [];
        }

        const cacheKey = `models-${make.toLowerCase()}`;

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }
        }

        try {
            const response = await this.makeRequest(`/get-models/${encodeURIComponent(make)}`);

            this.cache.set(cacheKey, {
                data: response.models,
                timestamp: Date.now()
            });

            return response.models;
        } catch (error) {
            console.error(`Failed to get models for ${make}:`, error);
            return [];
        }
    }

    async validateVehicle(make, model) {
        try {
            const response = await this.makeRequest('/validate-vehicle', {
                method: 'POST',
                body: JSON.stringify({ make, model })
            });

            return response;
        } catch (error) {
            console.error('Vehicle validation failed:', error);
            return { valid: false, message: 'Validation failed' };
        }
    }

    async getMarketTrends() {
        const cacheKey = 'market-trends';
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }
        }

        try {
            const response = await this.makeRequest('/market-trends');
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: response.market_trends,
                timestamp: Date.now()
            });

            return response.market_trends;
        } catch (error) {
            console.error('Failed to get market trends:', error);
            return {};
        }
    }

    async batchPredict(vehicles) {
        if (!Array.isArray(vehicles) || vehicles.length === 0) {
            throw new Error('Vehicles must be a non-empty array');
        }

        if (vehicles.length > 50) {
            throw new Error('Maximum 50 vehicles allowed per batch');
        }

        try {
            const response = await this.makeRequest('/batch-predict', {
                method: 'POST',
                body: JSON.stringify({ vehicles })
            });

            return response;
        } catch (error) {
            console.error('Batch prediction failed:', error);
            throw error;
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

class WheelzAIPriceIntegrator {
    constructor(apiBaseUrl = 'http://localhost:5000') {
        this.client = new VehiclePricePredictionClient(apiBaseUrl);
        this.isInitialized = false;
        this.currentPrediction = null;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing WheelzAI Price Integrator...');
            
            const isHealthy = await this.client.checkHealth();
            if (!isHealthy) {
                throw new Error('Price prediction API is not available');
            }

            this.isInitialized = true;
            console.log('✅ WheelzAI Price Integrator initialized successfully');
            
            // Setup form listeners
            this.setupFormListeners();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize price integrator:', error);
            this.showFallbackMessage();
            return false;
        }
    }

    setupFormListeners() {
        // Get form elements
        const makeSelect = document.querySelector('select[required]');
        const modelInput = document.querySelector('input[required]');
        const yearSelect = document.querySelectorAll('select[required]')[1];
        const mileageInput = document.querySelector('input[type="number"]');
        const conditionInputs = document.querySelectorAll('input[name="condition"]');

        if (makeSelect) {
            makeSelect.addEventListener('change', () => this.updateModels());
        }

        [makeSelect, modelInput, yearSelect, mileageInput].forEach(element => {
            if (element) {
                element.addEventListener('change', () => this.debounceUpdatePrice());
                element.addEventListener('input', () => this.debounceUpdatePrice());
            }
        });

        conditionInputs.forEach(input => {
            input.addEventListener('change', () => this.debounceUpdatePrice());
        });
    }

    async updateModels() {
        const makeSelect = document.querySelector('select[required]');
        const modelInput = document.querySelector('input[required]');
        
        if (!makeSelect || !modelInput) return;

        const selectedMake = makeSelect.value;
        if (!selectedMake) return;

        try {
            const models = await this.client.getModels(selectedMake);

            let datalist = document.getElementById('model-suggestions');
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = 'model-suggestions';
                modelInput.setAttribute('list', 'model-suggestions');
                modelInput.parentNode.appendChild(datalist);
            }

            datalist.innerHTML = '';
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                datalist.appendChild(option);
            });

        } catch (error) {
            console.error('Failed to update models:', error);
        }
    }

    debounceUpdatePrice() {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.updatePriceEstimate();
        }, 1000); 
    }

    async updatePriceEstimate() {
        if (!this.isInitialized) return;

        try {
            const vehicleData = this.collectVehicleData();
            if (!this.isFormComplete(vehicleData)) {
                return;
            }

            console.log('🔄 Updating price estimate...', vehicleData);
            this.showLoadingState();
            const prediction = await this.client.predictPrice(vehicleData);
            this.currentPrediction = prediction;
            this.updatePriceDisplay(prediction);
            console.log('✅ Price estimate updated:', prediction);
        } catch (error) {
            console.error('❌ Failed to update price estimate:', error);
            this.showErrorState(error.message);
        }
    }

    collectVehicleData() {
        const makeSelect = document.querySelector('select[required]');
        const modelInput = document.querySelector('input[required]');
        const yearSelect = document.querySelectorAll('select[required]')[1];
        const mileageInput = document.querySelector('input[type="number"]');
        const fuelSelect = document.querySelectorAll('select[required]')[3];
        const bodySelect = document.querySelectorAll('select[required]')[2];
        const conditionInput = document.querySelector('input[name="condition"]:checked');

        return {
            make: makeSelect?.value || '',
            model: modelInput?.value || '',
            year: parseInt(yearSelect?.value) || 0,
            mileage: parseInt(mileageInput?.value) || 0,
            fuel_type: fuelSelect?.value || '',
            body_type: bodySelect?.value || '',
            condition: conditionInput?.value || ''
        };
    }

    isFormComplete(data) {
        return data.make && data.model && data.year && data.mileage && 
               data.fuel_type && data.body_type && data.condition;
    }

    updatePriceDisplay(prediction) {
        const aiEstimateElement = document.getElementById('aiEstimate');
        if (!aiEstimateElement) return;

        const { formatted_range } = prediction.prediction;
        
        aiEstimateElement.innerHTML = `${formatted_range.lower} - ${formatted_range.upper}`;
        
        const infoElement = aiEstimateElement.nextElementSibling;
        if (infoElement) {
            const confidence = prediction.confidence || 'Medium';
            const marketStatus = prediction.market_analysis?.market_status || 'General Market';
            
            infoElement.innerHTML = `
                Based on Sri Lankan market data, vehicle condition, and mileage<br>
                <small>Confidence: ${confidence} | Market: ${marketStatus}</small>
            `;
        }
    }

    showLoadingState() {
        const aiEstimateElement = document.getElementById('aiEstimate');
        if (aiEstimateElement) {
            aiEstimateElement.innerHTML = `
                <span class="animate-pulse">Calculating...</span>
            `;
        }
    }

    showErrorState(message) {
        const aiEstimateElement = document.getElementById('aiEstimate');
        if (aiEstimateElement) {
            aiEstimateElement.innerHTML = `
                <span class="text-red-600">Estimation unavailable</span>
            `;
        }
    }

    showFallbackMessage() {
        const aiEstimateElement = document.getElementById('aiEstimate');
        if (aiEstimateElement) {
            aiEstimateElement.innerHTML = 'LKR 4.2L - 5.8L';
            
            const infoElement = aiEstimateElement.nextElementSibling;
            if (infoElement) {
                infoElement.innerHTML = 'Based on general market estimation (AI service offline)';
            }
        }
    }

    getCurrentPrediction() {
        return this.currentPrediction;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('sell') || document.getElementById('aiEstimate')) {
        window.wheelzAIPriceIntegrator = new WheelzAIPriceIntegrator();
        await window.wheelzAIPriceIntegrator.initialize();
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VehiclePricePredictionClient, WheelzAIPriceIntegrator };
}