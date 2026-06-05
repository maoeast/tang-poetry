#!/usr/bin/env python3
"""Generate missing poetry TTS audio files into the runtime audio directory."""

import argparse
import asyncio
import json
import os
import re
import time
from pathlib import Path

import edge_tts
from openai import OpenAI

MODEL = "stepaudio-2.5-tts"
VOICE = "cixingnansheng"
OUTPUT_FORMAT = "mp3"
BASE_URL = "https://api.stepfun.com/v1"
EDGE_VOICE = "zh-CN-YunxiNeural"
DEFAULT_PROVIDER = "auto"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = PROJECT_ROOT / "data" / "ts300.simple.json"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "public" / "audio" / "poetry"


def require_api_key() -> str:
    api_key = os.environ.get("STEPFUN_API_KEY", "").strip()

    if api_key:
        return api_key

    for env_path in (PROJECT_ROOT / ".env.local", PROJECT_ROOT / ".env"):
        if not env_path.exists():
            continue
        match = re.search(
            r'^STEPFUN_API_KEY\s*=\s*["\']?([^"\'\r\n]+)',
            env_path.read_text(encoding="utf-8"),
            re.MULTILINE,
        )
        if match:
            return match.group(1).strip()

    raise RuntimeError("Missing STEPFUN_API_KEY. Export it before running TTS generation.")


# UUIDs of the poems that historically lacked matched audio.
NEED_AUDIO_IDS = {
    "7066e611-faa5-427c-8fce-e0bf10c55416",
    "ea3f91f0-487e-4df7-826a-3692ef82e64d",
    "82f57261-b608-4ee9-8d88-7fde20c49a7a",
    "79e7ec6e-0d6c-4f95-8181-4671c42e1faf",
    "41d292d2-b752-4c30-8b6b-7b7380f2f9bd",
    "6d2e12c0-c1b8-4242-888c-9dba1a8f93ce",
    "ee2a3000-9127-43fa-8618-89a1937322cb",
    "9a4d3eae-fe01-46c7-a28b-8b518614a508",
    "f4301f96-e872-4eae-aa51-0d12328059d1",
    "1d6885a4-d11e-4428-80a8-fcf75d7a41aa",
    "162eb552-a496-4979-87e2-e441847d4e6f",
    "0f5af383-765a-4d56-b00b-79ee2ccd5111",
    "7ccd9915-51a1-4748-9989-af243036455b",
    "22923091-18da-429d-9ef1-6b367fd74b1a",
    "eb9530d2-e4c7-4c34-9214-06c28ca586bf",
    "368fc6bb-1636-419e-8ddb-cdc1dd07a1ca",
    "4a732464-35a5-4ffc-94d0-37d653eef2a1",
    "4bef9a5e-f4a1-44bd-a78c-cb0fe38ccdff",
    "8d480633-1876-4082-aaca-a7b3a26c04d7",
    "2c152693-c25f-45ce-8ef2-cbedce1a62bc",
    "6df38a77-6e5d-43ae-a115-7de36475f53e",
    "f9798830-48c1-45e3-be90-4028d93954dc",
    "11b013f9-aa6a-4e55-8e68-195dc62f161f",
    "4ddb6dda-68be-4bb2-8874-8508c6c6e3ad",
    "d850db6a-e07b-4fee-b642-57a70bdbbed2",
    "51262a8c-de53-41ee-958a-de08d5f5a446",
    "27ff54ab-4861-43d8-b3c1-69113d2e4e10",
    "ab4b1a7f-4fbe-438b-817f-9e1ed2d39f4f",
    "19340af6-e25d-41c8-90fc-b465d9be1134",
    "670009c2-a701-4140-aa31-b4973f76d632",
    "7377e34a-1aab-47e3-a6dd-376c98a5d6b7",
    "811a5f9e-0df5-46f1-a587-0d4df7bca5a0",
    "e006dfd3-40be-40ef-ba3b-552428931ae3",
    "b6475dea-1d69-4f0d-b98a-39393f47741e",
    "ae660471-84bc-4a58-a438-005b8a99c3c1",
    "0f7504df-cda2-4fe2-bc63-867ec2e418e7",
    "0167687e-8325-48bf-8da4-3749c9ce0a74",
    "d5da9d7d-1e52-4992-8be5-73e556b07e0b",
    "59063901-7dbc-4f22-974f-ddccab675cbc",
    "b5f1094b-b9be-43cf-8e04-9b984642a630",
    "73dadc56-88ff-4f11-9ff5-da0e0adf533c",
    "0db5450e-f1e0-4d53-8106-529def535537",
    "801c3192-8001-4238-8ecf-0111f490e84c",
    "a7b8e17f-ee93-4bdc-a144-b1ba5ab32bb5",
    "948fa40a-492e-4fa1-99f4-b002ae87cd24",
    "99167d13-8e2c-4b75-bf93-62b0682dfdd0",
    "abb3e465-f10e-43dd-b564-a5de08010478",
    "baccf46a-41c4-4a0f-b90f-37cc35b04a64",
    "f990af2e-d929-48da-a9b3-fdbc706ca4a3",
    "5593d522-b820-4c06-bab6-0ab5a0fc1d46",
    "9525f99d-39cb-4d04-8650-263493d223e0",
    "71999aa1-55dd-4449-81b0-41f04686bf2e",
    "e117d224-39ca-4eba-a047-0d36ce8b8c26",
    "f93545e7-747e-4d12-a6c8-e484c46b2860",
    "4e92a96d-aa74-4153-8314-b6df22d1e18a",
    "4bd5be2b-5788-42c0-a300-9d106a73d46e",
    "49194c4b-b775-4d21-a506-fc0a2ff308f1",
    "35319d7e-9cf6-43b0-bfa3-991cf82a49f9",
    "d4baf2d1-ea61-4fb3-a284-e889275bdca2",
    "caa023cf-9f55-450c-9638-1cf5c0223cc1",
    "527eba4b-b35c-4d29-99e7-8f40c6f3d5b7",
    "e12edd83-36cd-4e8a-a630-91874631c51f",
    "b4f9c5b3-0108-4127-bf3e-73fd207176f3",
    "9bd49546-5289-4351-97f4-d69296720dfc",
    "2d66a9e4-7b4d-4be4-91fd-6a4b2cd8817b",
    "0ed53ef4-30ca-41ac-a629-d778e5cc2bfa",
    "b881b056-6d92-45e8-9620-4710a375776f",
    "a7f425de-143b-493d-bb51-13e27c68e871",
    "f88a6dbd-bf83-458c-b5e2-85fdd1ed98b2",
    "2c036362-9f1d-434c-854f-b97a2a4bb19b",
    "acbe1729-cefd-4678-9719-09c5c9c27db0",
    "3b5db620-1964-4674-a01d-ad70ba3ebd2a",
    "733afc7b-e370-4724-b755-e9342c574d22",
    "87f5949b-bdad-4b5e-b488-7015bd45cc4f",
    "15180235-db35-499b-8fd5-b8d9fa92f5f2",
    "0710a746-8660-4bc1-b073-8ce51ac9f4d9",
    "aaae5882-9b74-4b45-9bb5-9f773a721119",
    "f1320c1f-949a-4cbe-ad23-4806878632c5",
    "92dd65da-8301-4c83-b8f3-986b6095c481",
    "15079155-e95e-4abc-b36e-f6b605848f37",
    "ac97d42b-8fef-42c9-829f-baafe89b4cdc",
    "526d4ecc-e123-4b9d-a213-958bb947593d",
    "a6c85d29-ad02-4f54-a347-63800213a7b4",
    "59fb3f01-65b2-416a-aefb-c13e502bfba1",
    "d0fa1454-f337-4343-ab4a-2a42dfdf4e8f",
    "1f66d2ec-8418-485e-a434-e21a0d439dda",
    "31cc87f3-da0f-421d-8674-8753530077e2",
    "e4a87504-f9a3-4599-b770-aba4afd3cb04",
    "0fb0189c-8ff3-4106-af94-f6d26d528a1d",
    "b4780bd1-1703-4bce-a801-d5ed566826b5",
    "e72db286-3b6a-425b-ad02-75248ea5a790",
    "80fe70cd-6e63-48eb-9c1e-ab26330d45d9",
    "228c87f2-092b-411b-9029-c5454cc2cb1c",
    "c8210485-a1f4-4c76-a1f6-2f5e57d39d29",
    "9154fc22-5e19-45b7-a506-435298bb26fc",
    "96455db1-a0c6-402c-8892-05c6b9a3d029",
    "b67ddf05-43fb-4859-a1a9-34f95d45aabf",
}

AUTHOR_INSTRUCTIONS = {
    "李白": "语气豪放飘逸，意境开阔，带有浪漫主义色彩",
    "杜甫": "语气沉郁顿挫，忧国忧民，感情深沉",
    "白居易": "语气平易近人，叙事流畅，情感真挚",
    "王维": "语气恬淡闲远，诗中有画，意境空灵",
    "李商隐": "语气含蓄婉约，深情绵邈，朦胧幽美",
    "孟浩然": "语气清旷冲淡，自然随意，意境悠远",
    "岑参": "语气雄奇瑰丽，边塞壮阔，气势磅礴",
    "王昌龄": "语气雄浑豪迈，边塞慷慨，意气风发",
    "刘长卿": "语气凄婉含蓄，意境幽远，清雅脱俗",
    "韦应物": "语气闲淡清雅，自然质朴，情致悠然",
    "柳宗元": "语气孤寂清峭，意境幽深，冷峻孤傲",
    "杜牧": "语气俊朗清丽，含蓄隽永，兼有感伤",
    "元稹": "语气真挚深切，感情浓烈，哀婉动人",
    "孟郊": "语气峭刻深挚，苦吟风格，感情质朴",
    "卢纶": "语气刚健有力，边塞豪壮，节奏铿锵",
    "温庭筠": "语气绮丽浓艳，辞藻华美，婉约缠绵",
    "张九龄": "语气高雅端庄，含蓄蕴藉，风骨清峻",
    "宋之问": "语气清丽婉转，对仗工整，音韵和谐",
    "崔颢": "语气雄浑奔放，意境开阔，气势恢宏",
    "张祜": "语气清丽含蓄，宫廷韵味，婉转动听",
    "李颀": "语气豪放不羁，音乐性强，节奏鲜明",
    "杜审言": "语气清丽典雅，格律工整，意境清新",
    "王之涣": "语气雄浑豪迈，气象宏大，意境开阔",
    "钱起": "语气清丽雅致，意境空灵，含蓄蕴藉",
    "韦庄": "语气疏朗清丽，婉约含蓄，情致绵长",
    "祖咏": "语气清新自然，意境开阔，简洁凝练",
}

POEM_INSTRUCTIONS = {
    "0f7504df-cda2-4fe2-bc63-867ec2e418e7": "极度豪放纵情，气势磅礴，有醉态但不失诗人风骨",
    "0167687e-8325-48bf-8da4-3749c9ce0a74": "苍凉辽阔，边塞月色下的征人思乡之情",
    "d5da9d7d-1e52-4992-8be5-73e556b07e0b": "华丽典雅，赞美容貌，如春风牡丹般雍容",
    "59063901-7dbc-4f22-974f-ddccab675cbc": "华丽典雅，赞美娇艳，如露华浓般旖旎",
    "b5f1094b-b9be-43cf-8e04-9b984642a630": "华丽典雅，赞美容貌，如春风牡丹般雍容",
    "73dadc56-88ff-4f11-9ff5-da0e0adf533c": "华丽典雅，赞美娇艳，如露华浓般旖旎",
    "0db5450e-f1e0-4d53-8106-529def535537": "华丽典雅，名花倾国两相欢，雍容华贵",
    "948fa40a-492e-4fa1-99f4-b002ae87cd24": "华丽典雅，赞美容貌，如春风牡丹般雍容",
    "99167d13-8e2c-4b75-bf93-62b0682dfdd0": "华丽典雅，赞美娇艳，如露华浓般旖旎",
    "527eba4b-b35c-4d29-99e7-8f40c6f3d5b7": "由困惑愤懑到豁达振奋，先抑后扬，结尾充满信心",
    "801c3192-8001-4238-8ecf-0111f490e84c": "感慨人生多艰，大道如青天我独不得出，愤懑中带无奈",
    "a7b8e17f-ee93-4bdc-a144-b1ba5ab32bb5": "含蓄深沉，有耳莫洗颍川水之高洁，淡泊中有坚定",
    "e12edd83-36cd-4e8a-a630-91874631c51f": "感慨人生多艰，大道如青天我独不得出，愤懑中带无奈",
    "b4f9c5b3-0108-4127-bf3e-73fd207176f3": "含蓄深沉，有耳莫洗颍川水之高洁，淡泊中有坚定",
    "abb3e465-f10e-43dd-b564-a5de08010478": "夏日柔美，镜湖三百里如画，轻快明朗",
    "baccf46a-41c4-4a0f-b90f-37cc35b04a64": "秋日萧瑟中带温情，长安一片月万户捣衣声",
    "f990af2e-d929-48da-a9b3-fdbc706ca4a3": "冬夜清冷，明朝驿使发一夜絮征袍，急切深情",
    "4e92a96d-aa74-4153-8314-b6df22d1e18a": "春日明媚，秦地罗敷女采桑绿水边，清新欢快",
    "4bd5be2b-5788-42c0-a300-9d106a73d46e": "夏日热烈，镜湖三百里如画，明快开朗",
    "49194c4b-b775-4d21-a506-fc0a2ff308f1": "秋夜静谧，长安一片月万户捣衣声，温柔深情",
    "35319d7e-9cf6-43b0-bfa3-991cf82a49f9": "冬夜清寒，明朝驿使发一夜絮征袍，急切含情",
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate missing TTS audio files for Tang poetry runtime assets.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help="Directory for generated mp3 files. Defaults to public/audio/poetry.",
    )
    parser.add_argument(
        "--rate-limit-seconds",
        type=float,
        default=1.0,
        help="Delay between requests to avoid throttling.",
    )
    parser.add_argument(
        "--poem-id",
        action="append",
        default=[],
        help="Generate audio only for the specified source poem UUID. Repeatable.",
    )
    parser.add_argument(
        "--provider",
        choices=["auto", "stepfun", "edge"],
        default=DEFAULT_PROVIDER,
        help="Preferred TTS provider. auto tries StepFun first and falls back to edge-tts.",
    )
    return parser.parse_args()


def get_instruction(poem: dict) -> str:
    poem_id = poem["id"]
    if poem_id in POEM_INSTRUCTIONS:
        return POEM_INSTRUCTIONS[poem_id]
    author = poem.get("author", "")
    if author in AUTHOR_INSTRUCTIONS:
        return AUTHOR_INSTRUCTIONS[author]
    return "语气温和自然，节奏舒缓，适合朗诵唐诗"


def build_input_text(poem: dict) -> str:
    title = poem.get("title", "")
    author = poem.get("author", "")
    paragraphs = poem.get("paragraphs", [])
    header = f"{title}，唐代，{author}。"
    content = "\n".join(paragraphs)
    return f"{header}\n{content}"


def build_speech_request(poem: dict) -> dict:
    input_text = build_input_text(poem)
    if len(input_text) > 950:
        input_text = input_text[:950]

    return {
        "model": MODEL,
        "voice": VOICE,
        "input": input_text,
        "response_format": OUTPUT_FORMAT,
        "instruction": get_instruction(poem),
        "volume": 1.0,
    }


def generate_with_stepfun(client: OpenAI, poem: dict, output_path: Path) -> None:
    payload = build_speech_request(poem)
    response = client.audio.speech.create(
        model=payload["model"],
        voice=payload["voice"],
        input=payload["input"],
        response_format=payload["response_format"],
        extra_body={
            "instruction": payload["instruction"],
            "volume": payload["volume"],
        },
    )

    with open(output_path, "wb") as f:
        f.write(response.content)


async def generate_with_edge_async(poem: dict, output_path: Path) -> None:
    communicate = edge_tts.Communicate(
        text=build_input_text(poem),
        voice=EDGE_VOICE,
    )
    await communicate.save(str(output_path))


def generate_with_edge(poem: dict, output_path: Path) -> None:
    asyncio.run(generate_with_edge_async(poem, output_path))


def main():
    args = parse_args()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        all_poems = json.load(f)

    if args.poem_id:
        target_ids = {p.strip() for p in args.poem_id if p.strip()}
    else:
        target_ids = set(NEED_AUDIO_IDS)

    poems_need_audio = [p for p in all_poems if p["id"] in target_ids]
    poems_need_audio = [
        p for p in poems_need_audio if not (output_dir / f"{p['id']}.mp3").exists()
    ]
    print(f"Found {len(poems_need_audio)} poems needing audio generation")

    client = None
    if args.provider in {"auto", "stepfun"}:
        api_key = require_api_key()
        client = OpenAI(api_key=api_key, base_url=BASE_URL)

    success = 0
    failed = 0
    skipped = 0

    for i, poem in enumerate(poems_need_audio, 1):
        poem_id = poem["id"]
        title = poem.get("title", "")
        author = poem.get("author", "")
        output_path = output_dir / f"{poem_id}.mp3"

        if output_path.exists():
            print(f"[{i}/{len(poems_need_audio)}] SKIP {author}《{title}》 — already exists")
            skipped += 1
            continue

        payload = build_speech_request(poem)
        if len(build_input_text(poem)) > len(payload["input"]):
            print(f"  WARNING: truncated input for {title}")

        print(f"[{i}/{len(poems_need_audio)}] {author}《{title}》 — {payload['instruction'][:30]}...")

        try:
            provider_used = args.provider
            if args.provider == "edge":
                generate_with_edge(poem, output_path)
            elif args.provider == "stepfun":
                generate_with_stepfun(client, poem, output_path)
            else:
                try:
                    generate_with_stepfun(client, poem, output_path)
                    provider_used = "stepfun"
                except Exception as stepfun_error:
                    print(f"  StepFun failed, falling back to edge-tts: {stepfun_error}")
                    generate_with_edge(poem, output_path)
                    provider_used = "edge"

            print(
                f"  OK — {output_path.stat().st_size:,} bytes saved to {output_path.name} via {provider_used}"
            )
            success += 1
        except Exception as error:
            print(f"  FAILED: {error}")
            failed += 1
            if output_path.exists():
                output_path.unlink()

        if i < len(poems_need_audio):
            time.sleep(max(args.rate_limit_seconds, 0))

    print(f"\nDone! Success: {success}, Failed: {failed}, Skipped: {skipped}")


if __name__ == "__main__":
    main()
