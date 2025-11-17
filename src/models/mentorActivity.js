module.exports = (sequelize, DataTypes) => {
    const MentorActivity = sequelize.define('MentorActivity', {
        mentor_activity_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        judul_aktivitas: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        deskripsi: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'mentor_activities',
        timestamps: false
    });

    MentorActivity.associate = function(models) {
        MentorActivity.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'mentor'
        });
    };

    return MentorActivity;
}