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

    static async updateActivity(req, res) {
        try {
            const { id } = req.params;
            const { judul_aktivitas, deskripsi } = req.body;
            const [updated] = await MentorActivity.update(
                { judul_aktivitas, deskripsi },
                { where: { mentor_activity_id: id } }
            );
            if (updated) {
                res.json({
                    success: true,
                    message: 'Activity updated successfully',
                    data: { id, judul_aktivitas, deskripsi }
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Activity not found',
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to update activity',
                error: error.message
            });
        }
    }
    static async deleteActivity(req, res) {
        try {
            const { id } = req.params;
            const deleted = await MentorActivity.destroy({ where: { mentor_activity_id: id } });
            if (deleted) {
                res.json({
                    success: true,
                    message: 'Activity deleted successfully',
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Activity not found',
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to delete activity',
                error: error.message
            });
        }
    }
}

module.exports = MentorController;