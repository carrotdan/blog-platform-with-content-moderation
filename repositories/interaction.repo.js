const Interaction = require('../models/Interaction');

class InteractionRepository {
  async create(interactionData) {
    return Interaction.create(interactionData);
  }

  async delete(user_id, target_id, type) {
    return Interaction.findOneAndDelete({ user_id, target_id, type });
  }

  async findInteraction(user_id, target_id, type) {
    return Interaction.findOne({ user_id, target_id, type });
  }

  async countInteractions(target_id, type) {
    return Interaction.countDocuments({ target_id, type });
  }

  async findUserInteractions(user_id, target_ids, type) {
    const interactions = await Interaction.find({
      user_id,
      target_id: { $in: target_ids },
      type
    });
    return interactions.map(i => i.target_id.toString());
  }
}

module.exports = new InteractionRepository();
