from faster_whisper import WhisperModel

def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("public/audio/cc459543-41c3-4a86-80c5-3665a86f4073.mp3", word_timestamps=True)

words = []
for segment in segments:
    for word in segment.words:
        words.append(word)

# Group words into chunks of ~6 words per caption line
chunk_size = 6
srt_lines = []
index = 1
for i in range(0, len(words), chunk_size):
    chunk = words[i:i+chunk_size]
    start = format_timestamp(chunk[0].start)
    end = format_timestamp(chunk[-1].end)
    text = "".join(w.word for w in chunk).strip()
    srt_lines.append(f"{index}\n{start} --> {end}\n{text}\n")
    index += 1

with open("test_output.srt", "w", encoding="utf-8") as f:
    f.write("\n".join(srt_lines))

print("SRT file created: test_output.srt")