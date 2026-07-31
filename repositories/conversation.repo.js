const Conversation = require('../models/Conversation');
const { BASE_AUTHOR_POPULATE } = require('../utils/populate');

class ConversationRepository {
  async findOrCreate(participants) {
    // Sort participants to ensure consistent matching
    const sortedParticipants = [...participants].sort();
    
    let conversation = await Conversation.findOne({
      participants: { $all: sortedParticipants, $size: sortedParticipants.length }
    });

    if (!conversation) {
      conversation = await Conversation.create({ participants: sortedParticipants });
    }
    
    return conversation;
  }

  async findByUser(userId) {
    return Conversation.find({ participants: userId })
      .populate({ path: 'participants', select: 'username avatar' })
      .populate('last_message')
      .sort({ updatedAt: -1 });
  }

  async findById(id) {
    return Conversation.findById(id).populate({ path: 'participants', select: 'username avatar' });
  }

  async updateLastMessage(id, messageId) {
    return Conversation.findByIdAndUpdate(id, { 
      last_message: messageId,
      updatedAt: new Date()
    }, { new: true });
  }
}

module.exports = new ConversationRepository();
