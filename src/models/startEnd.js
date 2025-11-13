module.exports = (sequelize, DataTypes) => {
    const StartEnd = sequelize.define('StartEnd', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        start: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        end: {
            type: DataTypes.TIME,
            allowNull: false,
        },
    }, {
        tableName: 'start_end',
        timestamps: false
    });

    StartEnd.associate = (models) => {
        StartEnd.belongsTo(models.MentoringDate, {
            foreignKey: 'mentoring_date_id',
            as: 'mentoring_date'
        });
    };

    return StartEnd;
}