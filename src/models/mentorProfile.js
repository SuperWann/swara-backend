module.exports = (sequelize, DataTypes) => {
  const MentorProfile = sequelize.define('MentorProfile', {
    mentor_profile_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    position: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Deskripsi singkat tentang mentor'
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Harga per sesi mentoring dalam rupiah'
    },
    profile_picture: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'URL foto profil mentor'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'mentor_profile',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  MentorProfile.associate = (models) => {
    MentorProfile.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return MentorProfile;
};
