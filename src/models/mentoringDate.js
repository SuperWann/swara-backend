module.exports = (sequelize, DataTypes) => {
    const MentoringDate = sequelize.define('MentoringDate', {
        mentoring_date_id: {
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
        date: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'mentoring_date',
        timestamps: false
    });

    MentoringDate.associate = (models) => {
        MentoringDate.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'mentor'
        });
        MentoringDate.hasMany(models.StartEnd, {
            foreignKey: 'mentoring_date_id',
            as: 'time_slots'
        });
    };

    return MentoringDate;
}