module.exports = (sequelize, DataTypes) => {
  const Match = sequelize.define('Match', {
    match_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    adu_swara_topic_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'adu_swara_topics',
        key: 'adu_swara_topic_id'
      }
    }
  }, {
    tableName: 'matchs',
    timestamps: false
  });

  Match.associate = (models) => {
    Match.belongsTo(models.AduSwaraTopic, {
      foreignKey: 'adu_swara_topic_id',
      as: 'topic'
    });

    Match.hasMany(models.MatchResult, {
      foreignKey: 'match_id',
      as: 'results'
    });
  };

  return Match;
};
