const Conversation = require('../models/Conversation');
const { BASE_AUTHOR_POPULATE } = require('../utils/populate');

class ConversationRepository {
  static buildParticipantKey(participants) {
    return [...participants].sort().join('_');
  }

  async findOrCreate(participants) {
    // Sort participants to ensure consistent matching
    const sortedParticipants = [...participants].sort();
    const participantKey = ConversationRepository.buildParticipantKey(sortedParticipants);

    // M29: Unique participant_key index makes the lookup atomic; a concurrent
    // duplicate create is retried against the winning document.
    let conversation = await Conversation.findOne({ participant_key: participantKey });

    if (!conversation) {
      try {
        conversation = await Conversation.create({
          participants: sortedParticipants,
          participant_key: participantKey
        });
      } catch (err) {
        // E11000 duplicate key → another request created it first; fetch it.
        if (err.code === 11000) {
          conversation = await Conversation.findOne({ participant_key: participantKey });
        } else {
          throw err;
        }
      }
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
