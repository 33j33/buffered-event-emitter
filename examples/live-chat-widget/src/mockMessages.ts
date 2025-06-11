import { BufferedEventEmitter } from 'buffered-event-emitter';

interface Message {
  id: string;
  text: string;
  timestamp: number;
  sender: string;
}

// Create event emitter with caching enabled
export const eventEmitter = new BufferedEventEmitter({
  cache: true,
  cacheCapacity: 20, 
});

const senders = ['Ash', 'Jay', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry'];

const messageTemplates = [
  'What a tense position on the board!',
  'Anyone else shocked by that blunder?',
  'That was a brilliant sacrifice!',
  'Can’t believe he played that move!',
  'This endgame is pure art',
  'That knight jump was unexpected!',
  'I think white has the advantage now',
  'Rook and pawn endgame incoming!',
  'He’s really low on time now!',
  'Amazing defense under pressure!',
  'Chat, who do you think wins?',
  'What engine eval saying now?',
  'Can’t miss a single move here',
  'Classic Carlsen magic!',
  'This is turning into a masterpiece',
  'Did he just miss mate in one?',
  'That opening prep was insane!',
  'Tiebreaks might be happening!',
  'She’s playing so confidently today!',
  'Magnus is in beast mode again',
  'Gukesh playing like a machine!',
  'Fabi’s prep is on another level',
  'That Gukesh move was so sharp!',
  'Fabi holding this endgame tight',
  'Big moment here for Gukesh!',
  'Gukesh is really grinding this out',
  'Fabi might be in trouble here',
  'Incredible nerves by young Gukesh',
  'Can Fabi turn this around?',
  'Gukesh is showing real champion form'
];


let messageCounter = 0;

function generateMessage(): Message {
  const sender = senders[Math.floor(Math.random() * senders.length)];
  const text = `[${Date.now().toString().slice(-6)}] ${messageTemplates[Math.floor(Math.random() * messageTemplates.length)]}`;
  
  return {
    id: `msg-${++messageCounter}`,
    text,
    timestamp: Date.now(),
    sender
  };
}

function getRandomDelay(): number {
  const delays = [100, 200, 300, 500, 900, 1000, 1300, 1500];
  return delays[Math.floor(Math.random() * delays.length)];
}

let count = 0
function emitMessage() {
  const message = generateMessage();
  eventEmitter.emit('new-message', message);
  count++
  
  // Schedule next message
  setTimeout(emitMessage, getRandomDelay());
}

// noop listener required to start populating cache
eventEmitter.on("new-message", () => {})

// Start emitting messages immediately to populate cache
// even before any listeners are attached
setTimeout(() => {
  emitMessage();
}, 0);