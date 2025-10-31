module.exports = (sequelize, DataTypes) => {
    const Badge = sequelize.define('Badge', {
        badge_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        badge_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Badge name is required' }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Description is required' }
            }
        },
        badge_icon: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Badge icon is required' }
            }
        }
    }, {
        tableName: 'badges',
        timestamps: false
    });

    Badge.associate = (models) => {
        Badge.belongsToMany(models.User, {
            through: 'user_badges',
            foreignKey: 'badge_id',
            otherKey: 'user_id',
            as: 'badges'
        });
    };

    return Badge;
}