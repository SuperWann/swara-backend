const { MentorActivity, User } = require('../models');

class MentorController {
    static async getAllActivities(req, res) {
        try {
            const activitiesByUserId = await MentorActivity.findAll({
                where: { user_id: req.params.id },
                include: [{
                    model: User,
                    as: 'mentor',
                    attributes: ['user_id', 'full_name']
                }]
            });
            res.json({
                success: true,
                message: 'Activities retrieved successfully',
                count: activitiesByUserId.length,
                data: activitiesByUserId
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get activities',
                error: error.message
            });
        }
    }

    static async createActivity(req, res) {
        try {
            const { user_id, judul_aktivitas, deskripsi } = req.body;
            const newActivity = await MentorActivity.create({ user_id, judul_aktivitas, deskripsi });
            res.json({
                success: true,
                message: 'Activity created successfully',
                data: newActivity
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create activity',
                error: error.message
            });
        }
    }

}

module.exports = MentorController;