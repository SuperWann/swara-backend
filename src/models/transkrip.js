module.exports = (sequelize, DataTypes) => {
    const Transkrip = sequelize.define('Transkrip', {
        transkrip_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        content_swara_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'content_swara',
                key: 'content_swara_id'
            }
        },
        waktu: {
            type: DataTypes.TIME,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Waktu is required' }
            }
        },
        transkrip: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Transkrip is required' }
            }
        }
    }, {
        tableName: 'transkrip',
        timestamps: false
    });

    Transkrip.associate = (models) => {
        Transkrip.belongsTo(models.ContentSwara, {
            foreignKey: 'content_swara_id',
            as: 'content'
        });
    };

    return Transkrip;
}