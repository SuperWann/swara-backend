const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class AIService {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000/api/analyze';
    this.timeout = 300000;
  }

  /**
   * Send video to AI service for analysis
   * @param {string} videoPath - Path to video file
   * @param {number} skorSwaraId - Skor Swara ID
   * @param {object} topicInfo - Topic information
   * @returns {Promise<object>} - AI analysis result
   */
  async analyzeVideo(videoPath, skorSwaraId, topicInfo) {
    try {
      const formData = new FormData();
      
      formData.append('video', fs.createReadStream(videoPath));
      
      formData.append('skor_swara_id', skorSwaraId);
      formData.append('topic', topicInfo.topic);
      formData.append('text', topicInfo.text);

      const response = await axios.post(this.aiServiceUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.AI_SERVICE_TOKEN || ''}`
        },
        timeout: this.timeout,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error.message);
      
      if (error.response) {
        throw new Error(`AI Service Error: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('AI Service tidak merespons. Silakan coba lagi nanti.');
      } else {
        throw new Error(`Error mengirim video ke AI: ${error.message}`);
      }
    }
  }

  /**
   * Validate AI response format
   * @param {object} aiResponse - Response from AI service
   * @returns {boolean}
   */
  validateResponse(aiResponse) {
    const requiredFields = [
      'kelancaran_point',
      'penggunaan_bahasa_point',
      'ekspresi_point',
      'kelancaran_suggest',
      'penggunaan_bahasa_suggest',
      'ekspresi_suggest'
    ];

    return requiredFields.every(field => aiResponse.hasOwnProperty(field));
  }

  /**
   * Send video to AI service for basic training analysis
   * @param {string} videoPath - Path to video file
   * @param {string} modeSlug - Mode slug (artikulasi, ekspresi, tempo)
   * @param {object} levelInfo - Level information
   * @returns {Promise<object>} - AI analysis result
   */
  async analyzeBasicTraining(videoPath, modeSlug, levelInfo) {
    try {
      const formData = new FormData();
      
      formData.append('video', fs.createReadStream(videoPath));
      formData.append('mode', modeSlug);
      formData.append('level', levelInfo.level);
      formData.append('level_name', levelInfo.level_name);
      formData.append('instruction', levelInfo.instruction || '');

      const basicTrainingUrl = process.env.AI_BASIC_TRAINING_URL || 
        'http://localhost:5000/api/analyze-basic-training';

      const response = await axios.post(basicTrainingUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.AI_SERVICE_TOKEN || ''}`
        },
        timeout: this.timeout,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return response.data;
    } catch (error) {
      console.error('AI Service Error (Basic Training):', error.message);
      
      if (error.response) {
        throw new Error(`AI Service Error: ${error.response.data.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('AI Service tidak merespons. Silakan coba lagi nanti.');
      } else {
        throw new Error(`Error mengirim video ke AI: ${error.message}`);
      }
    }
  }

  /**
   * Validate basic training AI response format
   * @param {object} aiResponse - Response from AI service
   * @returns {boolean}
   */
  validateBasicTrainingResponse(aiResponse) {
    const requiredFields = [
      'articulation_score',
      'expression_score',
      'tempo_score',
      'total_score'
    ];

    return requiredFields.every(field => aiResponse.hasOwnProperty(field));
  }
}

module.exports = new AIService();