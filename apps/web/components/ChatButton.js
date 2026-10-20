import { Chat } from './Icons';

/** Floating "chat with us" button (WhatsApp / Messenger link from site settings). */
export default function ChatButton({ href, label }) {
  if (!href) return null;
  return (
    <a className="chat-fab" href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
      <Chat size={24} />
    </a>
  );
}
