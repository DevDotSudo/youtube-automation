import sys
import os
import json
import re
import argparse
from pathlib import Path
from difflib import SequenceMatcher
from faster_whisper import WhisperModel

whisper_model_instance = None

NUMBER_MAP = {
    '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
    '11': 'eleven', '12': 'twelve', '13': 'thirteen', '14': 'fourteen',
    '15': 'fifteen', '16': 'sixteen', '17': 'seventeen', '18': 'eighteen',
    '19': 'nineteen', '20': 'twenty', '30': 'thirty', '40': 'forty',
    '50': 'fifty', '60': 'sixty', '70': 'seventy', '80': 'eighty', '90': 'ninety'
}

def get_whisper_model(model_size="tiny.en", device="cpu", compute_type="int8"):
    global whisper_model_instance
    if whisper_model_instance is None:
        print(f"[AutoCaption] Loading Whisper model ({model_size}, {device}, {compute_type})...")
        whisper_model_instance = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("[AutoCaption] Whisper model loaded successfully.")
    return whisper_model_instance

def normalize(text):
    return re.sub(r'[^a-zA-Z0-9]', '', text).lower()

def words_match(w1, w2):
    n1 = normalize(w1)
    n2 = normalize(w2)
    if not n1 or not n2:
        return False
    if n1 == n2:
        return True
    if NUMBER_MAP.get(n1) == n2 or NUMBER_MAP.get(n2) == n1:
        return True
    if len(n1) >= 3 and len(n2) >= 3:
        if n1.startswith(n2) or n2.startswith(n1):
            return True
        if SequenceMatcher(None, n1, n2).ratio() >= 0.65:
            return True
    return False

def align_audio_with_scenes(audio_path, script_scenes, model_size="tiny.en"):
    """
    Transcribes audio_path using faster-whisper with word timestamps,
    then aligns recognized words to script_scenes, returning millisecond-accurate
    startMs, endMs, durationMs, and word timings with zero-gap boundary bridging.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = get_whisper_model(model_size=model_size)
    segs, info = model.transcribe(audio_path, word_timestamps=True)
    total_duration_ms = int(info.duration * 1000)

    # 1. Collect all transcribed words with millisecond timings
    all_words = []
    raw_segments = []
    for s in segs:
        raw_segments.append({
            'start_ms': int(s.start * 1000),
            'end_ms': int(s.end * 1000),
            'text': s.text.strip()
        })
        for w in (s.words or []):
            clean_word = w.word.strip()
            if clean_word:
                all_words.append({
                    'word': clean_word,
                    'start_ms': int(w.start * 1000),
                    'end_ms': int(w.end * 1000),
                    'prob': float(getattr(w, 'probability', 1.0))
                })

    word_idx = 0
    scenes_out = []

    # 2. Match each scene sequentially with number handling, hyphen splitting, and fuzzy matching
    for i, sc in enumerate(script_scenes):
        sentence = sc.get('text') or sc.get('scriptText') or ''
        raw_tokens = re.split(r'[\s\-]+', sentence)
        target_words = [t for t in raw_tokens if normalize(t)]

        matched_words = []
        target_k = 0

        while word_idx < len(all_words) and target_k < len(target_words):
            if words_match(all_words[word_idx]['word'], target_words[target_k]):
                matched_words.append(all_words[word_idx])
                target_k += 1
                word_idx += 1
            else:
                # Lookahead matching for slight misrecognition or skipped words
                found = False
                for look in range(1, min(6, len(target_words) - target_k)):
                    if words_match(all_words[word_idx]['word'], target_words[target_k + look]):
                        target_k += look
                        matched_words.append(all_words[word_idx])
                        target_k += 1
                        word_idx += 1
                        found = True
                        break
                if not found:
                    word_idx += 1

        if matched_words:
            start_speech_ms = matched_words[0]['start_ms']
            end_speech_ms = matched_words[-1]['end_ms']
        elif len(raw_segments) > i:
            start_speech_ms = raw_segments[i]['start_ms']
            end_speech_ms = raw_segments[i]['end_ms']
        else:
            start_speech_ms = 0
            end_speech_ms = total_duration_ms if i == len(script_scenes) - 1 else 0

        scenes_out.append({
            'index': int(sc.get('index', sc.get('sceneIndex', i + 1))),
            'id': sc.get('id'),
            'text': sentence,
            'speech_start_ms': int(start_speech_ms),
            'speech_end_ms': int(end_speech_ms),
            'words': matched_words
        })

    # 3. Seamless boundary bridging for zero-gap visual scene transitions
    for i in range(len(scenes_out)):
        cur = scenes_out[i]
        if i == 0:
            cur['start_ms'] = 0
        else:
            prev = scenes_out[i - 1]
            cur['start_ms'] = prev['end_ms']

        if i < len(scenes_out) - 1:
            nxt = scenes_out[i + 1]
            next_speech_start = nxt['speech_start_ms']
            cur_speech_end = cur['speech_end_ms']
            if next_speech_start > cur_speech_end:
                # Place boundary at the midpoint of pause between sentences
                cur['end_ms'] = int((cur_speech_end + next_speech_start) // 2)
            else:
                cur['end_ms'] = max(int(cur_speech_end), int(cur['start_ms']) + 1000)
        else:
            cur['end_ms'] = max(int(total_duration_ms), int(cur['speech_end_ms']))

        cur['duration_ms'] = int(cur['end_ms'] - cur['start_ms'])

    return {
        'total_duration_ms': int(total_duration_ms),
        'scenes': scenes_out,
        'segments': raw_segments
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Whisper Auto-Caption & Scene Alignment")
    parser.add_argument("--audio", required=True, help="Path to audio file (e.g. master_voice.wav)")
    parser.add_argument("--scenes", help="JSON string or path to JSON file with script scenes")
    parser.add_argument("--output", help="Optional path to output JSON file")
    args = parser.parse_args()

    scenes_data = []
    if args.scenes:
        if os.path.exists(args.scenes):
            with open(args.scenes, 'r', encoding='utf-8-sig') as f:
                scenes_data = json.load(f)
        else:
            scenes_data = json.loads(args.scenes)

    result = align_audio_with_scenes(args.audio, scenes_data)

    out_json = json.dumps(result, indent=2)
    if args.output:
        with open(args.output, 'w', encoding='utf-8-sig') as f:
            f.write(out_json)
        print(f"[AutoCaption] Wrote alignment output to {args.output}")
    else:
        print(out_json)
