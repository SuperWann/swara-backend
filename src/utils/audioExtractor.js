const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;  
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class AudioExtractor {
  static async extractFromCloudinary(cloudinaryUrl, outputFormat = 'wav') {
    const tempDir = path.join(__dirname, '../temp');
    await fs.ensureDir(tempDir);

    const uniqueId = uuidv4();
    const tempVideoPath = path.join(tempDir, `video_${uniqueId}.mp4`);
    const tempAudioPath = path.join(tempDir, `audio_${uniqueId}.${outputFormat}`);

    try {
      // Download video
      console.log('📥 Downloading video...');
      const response = await axios.get(cloudinaryUrl, {
        responseType: 'stream',
        timeout: 60000 // 60 seconds timeout
      });

      const writer = fs.createWriteStream(tempVideoPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Check if video has audio
      const hasAudio = await this.checkAudioTrack(tempVideoPath);
      if (!hasAudio) {
        throw new Error('Video does not contain audio track');
      }

      // Extract audio
      console.log('🎵 Extracting audio...');
      await this.extractAudio(tempVideoPath, tempAudioPath, outputFormat);

      // Get metadata
      const metadata = await this.getAudioMetadata(tempAudioPath);

      return {
        audioPath: tempAudioPath,
        videoPath: tempVideoPath,
        metadata,
        cleanup: async () => {
          await fs.remove(tempVideoPath);
          await fs.remove(tempAudioPath);
        }
      };

    } catch (error) {
      // Cleanup on error
      await fs.remove(tempVideoPath).catch(() => {});
      await fs.remove(tempAudioPath).catch(() => {});
      throw error;
    }
  }

  static async checkAudioTrack(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const hasAudio = metadata.streams.some(
            stream => stream.codec_type === 'audio'
          );
          resolve(hasAudio);
        }
      });
    });
  }

  static async extractAudio(inputPath, outputPath, format = 'wav') {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath).output(outputPath);

      // Configuration based on format
      if (format === 'wav') {
        command
          .audioCodec('pcm_s16le')
          .audioFrequency(16000)
          .audioChannels(1);
      } else if (format === 'mp3') {
        command
          .audioCodec('libmp3lame')
          .audioBitrate('192k');
      }

      command
        .noVideo()
        .on('start', (cmd) => console.log('FFmpeg:', cmd))
        .on('progress', (p) => console.log(`Progress: ${Math.round(p.percent)}%`))
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  static async getAudioMetadata(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) reject(err);
        else resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          sampleRate: metadata.streams[0]?.sample_rate,
          channels: metadata.streams[0]?.channels
        });
      });
    });
  }
}

module.exports = AudioExtractor;