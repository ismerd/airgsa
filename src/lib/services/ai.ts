export type AiSignalInput = {
  postId: string;
  title: string;
  summary: string;
};

export async function classifyCargoSignal(_input: AiSignalInput) {
  void _input;
  throw new Error("OpenAI integration placeholder: no AI logic is implemented in the MVP.");
}
