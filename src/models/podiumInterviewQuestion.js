module.exports = (sequelize, DataTypes) => {
  const PodiumInterviewQuestion = sequelize.define('PodiumInterviewQuestion', {
    podium_interview_question_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Question is required' }
      }
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    podium_category_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'podium_categories',
        key: 'podium_category_id'
      }
    }
  }, {
    tableName: 'podium_interview_questions', 
    timestamps: false
  });

  PodiumInterviewQuestion.associate = (models) => {
    PodiumInterviewQuestion.belongsTo(models.PodiumCategory, {
      foreignKey: 'podium_category_id', 
      as: 'category'
    });

    PodiumInterviewQuestion.hasMany(models.PodiumInterviewResult, {
      foreignKey: 'podium_interview_question_id', 
      as: 'answers'
    });
  };

  return PodiumInterviewQuestion;
};
