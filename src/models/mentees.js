module.exports = (sequelize, DataTypes) => {
    const Mentee = sequelize.define('Mentee', {
        mentee_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        user_id:{
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        point: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                notEmpty: { msg: 'Point is required' },
            }
        },
        exercise_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Exercise count is required' }
            }
        },
        minute_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Minute count is required' },
            }
        },
        token_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Token is required' },
            }
        },
        last_token_reset: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    }, {
        tableName: 'mentees',
        timestamps: false
    });

    Mentee.associate = (models) => {
        Mentee.belongsTo(models.User, { foreignKey: 'user_id', as: 'users' });
    };

    return Mentee;
}