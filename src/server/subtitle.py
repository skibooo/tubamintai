import sys
from faster_whisper import WhisperModel


def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def generate_srt(audio_path, output_path, chunk_size=6):
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path, word_timestamps=True)

    words = []
    for segment in segments:
        for word in segment.words:
            words.append(word)

    srt_lines = []
    index = 1
    for i in range(0, len(words), chunk_size):
        chunk = words[i:i + chunk_size]
        start = format_timestamp(chunk[0].start)
        end = format_timestamp(chunk[-1].end)
        text = "".join(w.word for w in chunk).strip()
        srt_lines.append(f"{index}\n{start} --> {end}\n{text}\n")
        index += 1

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))

    return output_path


if __name__ == "__main__":
    # Usage: python subtitle.py <audio_path> <output_srt_path>
    audio_path = sys.argv[1]
    output_path = sys.argv[2]
    result = generate_srt(audio_path, output_path)
    print(result)