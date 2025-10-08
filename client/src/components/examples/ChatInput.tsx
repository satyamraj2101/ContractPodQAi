import { ChatInput } from '../ChatInput'

export default function ChatInputExample() {
  return (
    <ChatInput
      onSendMessage={(msg) => console.log('Message sent:', msg)}
    />
  )
}
