const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class AudioExtractor {
  /**
   * Extract audio from local video file (recommended for newly uploaded files)
   */
  static async extractFromLocalFile(videoPath, outputFormat = "wav") {
    const tempDir = path.join(__dirname, "../temp");
    await fs.ensureDir(tempDir);

    const uniqueId = uuidv4();
    const tempAudioPath = path.join(tempDir, `audio_${uniqueId}.${outputFormat}`);

    try {
      // Check if video has audio
      console.log("🔍 Checking audio track in video...");
      const hasAudio = await this.checkAudioTrack(videoPath);
      if (!hasAudio) {
        throw new Error("Video does not contain audio track");
      }

      // Extract audio
      console.log("🎵 Extracting audio from local file...");
      await this.extractAudio(videoPath, tempAudioPath, outputFormat);

      // Get metadata
      const metadata = await this.getAudioMetadata(tempAudioPath);
      console.log("✅ Audio extracted successfully from local file");

      return {
        audioPath: tempAudioPath,
        videoPath: videoPath, // Return original video path
        metadata,
        cleanup: async () => {
          // Only delete audio, keep original video
          await fs.remove(tempAudioPath);
        },
      };
    } catch (error) {
      // Cleanup on error
      await fs.remove(tempAudioPath).catch(() => {});
      throw error;
    }
  }

  /**
   * Extract audio from Cloudinary URL (legacy method for already uploaded videos)
   */
  static async extractFromCloudinary(cloudinaryUrl, outputFormat = "wav") {
    const tempDir = path.join(__dirname, "../temp");
    await fs.ensureDir(tempDir);

    const uniqueId = uuidv4();
    const tempVideoPath = path.join(tempDir, `video_${uniqueId}.mp4`);
    const tempAudioPath = path.join(tempDir, `audio_${uniqueId}.${outputFormat}`);

    try {
      // Download video with retry mechanism
      console.log("📥 Downloading video from Cloudinary...");

      let retryCount = 0;
      const maxRetries = 3;
      let downloadSuccess = false;

      while (retryCount < maxRetries && !downloadSuccess) {
        try {
          const response = await axios.get(cloudinaryUrl, {
            responseType: "stream",
            timeout: 120000, // 2 minutes timeout (increased)
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          });

          const writer = fs.createWriteStream(tempVideoPath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          downloadSuccess = true;
          console.log("✅ Video downloaded successfully");
        } catch (downloadError) {
          retryCount++;
          console.log(`⚠️ Download attempt ${retryCount} failed:`, downloadError.message);

          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying in 3 seconds... (${retryCount}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } else {
            throw new Error(`Failed to download video after ${maxRetries} attempts: ${downloadError.message}`);
          }
        }
      }

      // Check if video has audio
      const hasAudio = await this.checkAudioTrack(tempVideoPath);
      if (!hasAudio) {
        throw new Error("Video does not contain audio track");
      }

      // Extract audio
      console.log("🎵 Extracting audio...");
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
        },
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
          const hasAudio = metadata.streams.some((stream) => stream.codec_type === "audio");
          resolve(hasAudio);
        }
      });
    });
  }

  static async extractAudio(inputPath, outputPath, format = "wav") {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath).output(outputPath);

      // Configuration based on format
      if (format === "wav") {
        command.audioCodec("pcm_s16le").audioFrequency(16000).audioChannels(1);
      } else if (format === "mp3") {
        command.audioCodec("libmp3lame").audioBitrate("192k");
      }

      command
        .noVideo()
        .on("start", (cmd) => console.log("FFmpeg:", cmd))
        .on("progress", (p) => console.log(`Progress: ${Math.round(p.percent)}%`))
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });
  }

  static async getAudioMetadata(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) reject(err);
        else
          resolve({
            duration: metadata.format.duration,
            size: metadata.format.size,
            bitrate: metadata.format.bit_rate,
            sampleRate: metadata.streams[0]?.sample_rate,
            channels: metadata.streams[0]?.channels,
          });
      });
    });
  }
}

module.exports = AudioExtractor;
