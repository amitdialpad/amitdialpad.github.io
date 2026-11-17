#!/usr/bin/env python3
"""Install a branch-scoped Workloop starter into the current GitHub repository.

This installer only writes local files. It never commits, pushes, or asks for a
credential. The installed workflow records code activity after a branch push;
it does not infer that product acceptance criteria passed.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


PLAN_PATH = Path("VIRTUAL_PM.md")
CONFIG_PATH = Path(".virtual-pm.json")
WORKFLOW_PATH = Path(".github/workflows/virtual-pm.yml")
SYNC_PATH = Path(".github/scripts/virtual_pm_sync.py")
FILES = (PLAN_PATH, CONFIG_PATH, WORKFLOW_PATH, SYNC_PATH)
# Exact digest of the last published pre-Workloop updater. It is accepted for
# existing installs only; arbitrary local edits still fail verification.
LEGACY_SYNC_SHA256 = "85c0cef3df877a8827037edc5f3b1fde64e1ffe8dc87ccceb572a73a05f5d4e3"
REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
SYNC_PAYLOAD = "IyEvdXNyL2Jpbi9lbnYgcHl0aG9uMwoiIiJSZWNvcmQgc2hhcmVkLWJyYW5jaCBjb2RlIGFjdGl2aXR5IGluIFZJUlRVQUxfUE0ubWQgYWZ0ZXIgR2l0SHViIHB1c2hlcy4KCk9ubHkgYWN0aXZpdHkgYW5kIGEgbWFwcGVkIHRhc2sncyBXb3JraW5nIHN0YXRlIGFyZSBpbmZlcnJlZCBmcm9tIGNoYW5nZWQgY29kZS4KVGhpcyBuZXZlciBtYXJrcyBhIHRhc2sgRG9uZSBvciBjaGFuZ2VzIHByb2R1Y3QgZGVjaXNpb25zIG9yIGFjY2VwdGFuY2UgcHJvb2YuCiIiIgoKZnJvbSBfX2Z1dHVyZV9fIGltcG9ydCBhbm5vdGF0aW9ucwoKaW1wb3J0IGpzb24KaW1wb3J0IG9zCmZyb20gZm5tYXRjaCBpbXBvcnQgZm5tYXRjaApmcm9tIHBhdGhsaWIgaW1wb3J0IFBhdGgKaW1wb3J0IHJlCmltcG9ydCBzdWJwcm9jZXNzCmltcG9ydCB0aW1lCgoKQ09ORklHX1BBVEggPSBQYXRoKCIudmlydHVhbC1wbS5qc29uIikKU1lOQ19SRSA9IHJlLmNvbXBpbGUociI8IS0tIHZpcnR1YWwtcG0tc3luY2VkOiAoWzAtOWEtZl17NDB9KSAtLT4iKQpTVEFSVCA9ICI8IS0tIHZpcnR1YWwtcG0tYWN0aXZpdHk6c3RhcnQgLS0+IgpFTkQgPSAiPCEtLSB2aXJ0dWFsLXBtLWFjdGl2aXR5OmVuZCAtLT4iCkxBVEVTVCA9ICIqKkxhdGVzdCBjb2RlIGFjdGl2aXR5IChhdXRvbWF0aWMpOioqIgpTSEFfUkUgPSByZS5jb21waWxlKHIiWzAtOWEtZl17NDB9XFoiKQpSRVBPX1JFID0gcmUuY29tcGlsZShyIltBLVphLXowLTlfLi1dKy9bQS1aYS16MC05Xy4tXStcWiIpCklHTk9SRURfU1VGRklYRVMgPSAoIi5tZCIsICIubG9jayIpCklHTk9SRURfTkFNRVMgPSB7InBhY2thZ2UtbG9jay5qc29uIiwgIm5wbS1zaHJpbmt3cmFwLmpzb24iLCAieWFybi5sb2NrIiwgInBucG0tbG9jay55YW1sIn0KCgpkZWYgZ2l0KCphcmdzOiBzdHIsIGNoZWNrOiBib29sID0gVHJ1ZSkgLT4gc3VicHJvY2Vzcy5Db21wbGV0ZWRQcm9jZXNzW3N0cl06CiAgICByZXR1cm4gc3VicHJvY2Vzcy5ydW4oCiAgICAgICAgWyJnaXQiLCAqYXJnc10sIGNoZWNrPWNoZWNrLCBjYXB0dXJlX291dHB1dD1UcnVlLCB0ZXh0PVRydWUKICAgICkKCgpkZWYgdmFsaWRhdGVfc2hhKHNoYTogc3RyKSAtPiBzdHI6CiAgICBpZiBub3QgU0hBX1JFLmZ1bGxtYXRjaChzaGEpOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIkludmFsaWQgV29ya2xvb3Agc3luYyByZXZpc2lvbiIpCiAgICByZXR1cm4gc2hhCgoKZGVmIGxvYWRfY29uZmlnKCkgLT4gZGljdDoKICAgIGNvbmZpZyA9IGpzb24ubG9hZHMoQ09ORklHX1BBVEgucmVhZF90ZXh0KCkpCiAgICBpZiBjb25maWcuZ2V0KCJ2ZXJzaW9uIikgIT0gMToKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJVbnN1cHBvcnRlZCBXb3JrbG9vcCBjb25maWd1cmF0aW9uIikKICAgIGlmIG5vdCBSRVBPX1JFLmZ1bGxtYXRjaChjb25maWcuZ2V0KCJyZXBvc2l0b3J5IiwgIiIpKToKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJJbnZhbGlkIEdpdEh1YiByZXBvc2l0b3J5IGluIFdvcmtsb29wIGNvbmZpZ3VyYXRpb24iKQogICAgYnJhbmNoID0gY29uZmlnLmdldCgiYnJhbmNoIikKICAgIGlmIG5vdCBpc2luc3RhbmNlKGJyYW5jaCwgc3RyKSBvciBub3QgYnJhbmNoIG9yICJcbiIgaW4gYnJhbmNoOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIkludmFsaWQgYnJhbmNoIGluIFdvcmtsb29wIGNvbmZpZ3VyYXRpb24iKQogICAgaWYgZ2l0KCJjaGVjay1yZWYtZm9ybWF0IiwgIi0tYnJhbmNoIiwgYnJhbmNoLCBjaGVjaz1GYWxzZSkucmV0dXJuY29kZToKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJJbnZhbGlkIEdpdCBicmFuY2ggaW4gV29ya2xvb3AgY29uZmlndXJhdGlvbiIpCiAgICBwbGFuID0gY29uZmlnLmdldCgicGxhbiIpCiAgICBpZiBwbGFuICE9ICJWSVJUVUFMX1BNLm1kIjoKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJVbmV4cGVjdGVkIFdvcmtsb29wIHBsYW4gcGF0aCIpCiAgICB0YXNrcyA9IGNvbmZpZy5nZXQoInRhc2tzIikKICAgIGlmIG5vdCBpc2luc3RhbmNlKHRhc2tzLCBkaWN0KToKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJXb3JrbG9vcCB0YXNrIG1hcCBtdXN0IGJlIGFuIG9iamVjdCIpCiAgICBmb3IgdGl0bGUsIHBhdHRlcm5zIGluIHRhc2tzLml0ZW1zKCk6CiAgICAgICAgaWYgbm90IGlzaW5zdGFuY2UodGl0bGUsIHN0cikgb3Igbm90IGlzaW5zdGFuY2UocGF0dGVybnMsIGxpc3QpIG9yIG5vdCBhbGwoCiAgICAgICAgICAgIGlzaW5zdGFuY2UocGF0dGVybiwgc3RyKSBmb3IgcGF0dGVybiBpbiBwYXR0ZXJucwogICAgICAgICk6CiAgICAgICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIldvcmtsb29wIHRhc2sgbWFwcGluZyBpcyBtYWxmb3JtZWQiKQogICAgcmV0dXJuIGNvbmZpZwoKCmRlZiBjaGFuZ2VkX3BhdGhzKGJhc2U6IHN0ciwgaGVhZDogc3RyKSAtPiBsaXN0W3N0cl06CiAgICB2YWxpZGF0ZV9zaGEoYmFzZSkKICAgIHZhbGlkYXRlX3NoYShoZWFkKQogICAgaWYgZ2l0KCJjYXQtZmlsZSIsICItZSIsIGYie2Jhc2V9Xnt7Y29tbWl0fX0iLCBjaGVjaz1GYWxzZSkucmV0dXJuY29kZToKICAgICAgICBnaXQoImZldGNoIiwgIi0tbm8tdGFncyIsICItLWZpbHRlcj1ibG9iOm5vbmUiLCAiLS1kZXB0aD0xIiwgIm9yaWdpbiIsIGJhc2UpCiAgICBpZiBnaXQoIm1lcmdlLWJhc2UiLCAiLS1pcy1hbmNlc3RvciIsIGJhc2UsIGhlYWQsIGNoZWNrPUZhbHNlKS5yZXR1cm5jb2RlOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIldvcmtsb29wIG1hcmtlciBpcyBub3QgYW4gYW5jZXN0b3Igb2YgdGhpcyBicmFuY2giKQogICAgcmVzdWx0ID0gZ2l0KCJkaWZmIiwgIi0tbmFtZS1vbmx5IiwgIi0tZGlmZi1maWx0ZXI9QUNNUkQiLCBiYXNlLCBoZWFkLCAiLS0iKQogICAgcmV0dXJuIHNvcnRlZChzZXQocmVzdWx0LnN0ZG91dC5zcGxpdGxpbmVzKCkpKQoKCmRlZiBjb2RlX3BhdGhzKHBhdGhzOiBsaXN0W3N0cl0pIC0+IGxpc3Rbc3RyXToKICAgIHJldHVybiBbCiAgICAgICAgcGF0aCBmb3IgcGF0aCBpbiBwYXRocwogICAgICAgIGlmIG5vdCBwYXRoLnN0YXJ0c3dpdGgoIi5naXRodWIvIikKICAgICAgICBhbmQgbm90IHBhdGguc3RhcnRzd2l0aCgiLnZpcnR1YWwtcG0iKQogICAgICAgIGFuZCBwYXRoICE9ICJWSVJUVUFMX1BNLm1kIgogICAgICAgIGFuZCBQYXRoKHBhdGgpLm5hbWUgbm90IGluIElHTk9SRURfTkFNRVMKICAgICAgICBhbmQgbm90IHBhdGguZW5kc3dpdGgoSUdOT1JFRF9TVUZGSVhFUykKICAgIF0KCgpkZWYgdGFza19tYXRjaGVzKHBhdGhzOiBsaXN0W3N0cl0sIHRhc2tzOiBkaWN0W3N0ciwgbGlzdFtzdHJdXSkgLT4gZGljdFtzdHIsIGxpc3Rbc3RyXV06CiAgICByZXR1cm4gewogICAgICAgIHRpdGxlOiBbcGF0aCBmb3IgcGF0aCBpbiBwYXRocyBpZiBhbnkoZm5tYXRjaChwYXRoLCBwYXR0ZXJuKSBmb3IgcGF0dGVybiBpbiBwYXR0ZXJucyldCiAgICAgICAgZm9yIHRpdGxlLCBwYXR0ZXJucyBpbiB0YXNrcy5pdGVtcygpCiAgICAgICAgaWYgYW55KGFueShmbm1hdGNoKHBhdGgsIHBhdHRlcm4pIGZvciBwYXR0ZXJuIGluIHBhdHRlcm5zKSBmb3IgcGF0aCBpbiBwYXRocykKICAgIH0KCgpkZWYgdXBkYXRlX3Rhc2soY29udGVudDogc3RyLCB0aXRsZTogc3RyLCBhY3Rpdml0eTogc3RyKSAtPiBzdHI6CiAgICBoZWFkaW5nID0gZiIjIyMge3RpdGxlfVxuIgogICAgc3RhcnRfYXQgPSBjb250ZW50LmZpbmQoIiMjIFRhc2tzIikKICAgIGlmIHN0YXJ0X2F0IDwgMDoKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJXb3JrbG9vcCBwbGFuIGhhcyBubyBUYXNrcyBzZWN0aW9uIikKICAgIHN0YXJ0ID0gY29udGVudC5maW5kKGhlYWRpbmcsIHN0YXJ0X2F0KQogICAgaWYgc3RhcnQgPCAwOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoZiJXb3JrbG9vcCB0YXNrIGhlYWRpbmcgaXMgbWlzc2luZzoge3RpdGxlfSIpCiAgICBlbmQgPSBjb250ZW50LmZpbmQoIlxuIyMgIiwgc3RhcnQgKyBsZW4oaGVhZGluZykpCiAgICBvdGhlcl90YXNrID0gY29udGVudC5maW5kKCJcbiMjIyAiLCBzdGFydCArIGxlbihoZWFkaW5nKSkKICAgIGlmIGVuZCA8IDAgb3IgKG90aGVyX3Rhc2sgPj0gMCBhbmQgb3RoZXJfdGFzayA8IGVuZCk6CiAgICAgICAgZW5kID0gb3RoZXJfdGFzawogICAgaWYgZW5kIDwgMDoKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKGYiV29ya2xvb3AgdGFzayBoYXMgbm8gY2xvc2luZyBoZWFkaW5nOiB7dGl0bGV9IikKICAgIGJsb2NrID0gY29udGVudFtzdGFydDplbmRdCiAgICBpZiBibG9jay5jb3VudChMQVRFU1QpICE9IDE6CiAgICAgICAgcmFpc2UgVmFsdWVFcnJvcihmIldvcmtsb29wIHRhc2sgbXVzdCBoYXZlIG9uZSBhY3Rpdml0eSBsaW5lOiB7dGl0bGV9IikKICAgIGJsb2NrID0gcmUuc3ViKAogICAgICAgIHIiXlwqXCpMYXRlc3QgY29kZSBhY3Rpdml0eSBcKGF1dG9tYXRpY1wpOlwqXCouKiQiLAogICAgICAgIGYie0xBVEVTVH0ge2FjdGl2aXR5fSIsIGJsb2NrLCBjb3VudD0xLCBmbGFncz1yZS5NVUxUSUxJTkUsCiAgICApCiAgICBibG9jayA9IHJlLnN1YigKICAgICAgICByIl5cKlwqU3RhdGU6XCpcKiAoPzpPcGVufFRvIGRvKVwuPyQiLAogICAgICAgICIqKlN0YXRlOioqIFdvcmtpbmcg4oCUIGNvZGUgY2hhbmdlZDsgYWNjZXB0YW5jZSBwcm9vZiBwZW5kaW5nLiIsCiAgICAgICAgYmxvY2ssIGNvdW50PTEsIGZsYWdzPXJlLk1VTFRJTElORSwKICAgICkKICAgIHJldHVybiBjb250ZW50WzpzdGFydF0gKyBibG9jayArIGNvbnRlbnRbZW5kOl0KCgpkZWYgcmVuZGVyX3BsYW4oY29udGVudDogc3RyLCBoZWFkOiBzdHIsIHBhdGhzOiBsaXN0W3N0cl0sIGNvbmZpZzogZGljdCkgLT4gc3RyOgogICAgdmFsaWRhdGVfc2hhKGhlYWQpCiAgICBtYXJrZXJzID0gU1lOQ19SRS5maW5kYWxsKGNvbnRlbnQpCiAgICBpZiBsZW4obWFya2VycykgIT0gMSBvciBjb250ZW50LmNvdW50KFNUQVJUKSAhPSAxIG9yIGNvbnRlbnQuY291bnQoRU5EKSAhPSAxOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIldvcmtsb29wIHBsYW4gaGFzIG1pc3Npbmcgb3IgZHVwbGljYXRlIHN5bmMgbWFya2VycyIpCiAgICBiYXNlID0gbWFya2Vyc1swXQogICAgaWYgYmFzZSA9PSBoZWFkOgogICAgICAgIHJldHVybiBjb250ZW50CiAgICByZWxldmFudCA9IGNvZGVfcGF0aHMocGF0aHMpCiAgICBpZiBub3QgcmVsZXZhbnQ6CiAgICAgICAgcmV0dXJuIGNvbnRlbnQKICAgIHVybCA9IGYiaHR0cHM6Ly9naXRodWIuY29tL3tjb25maWdbJ3JlcG9zaXRvcnknXX0vY29tcGFyZS97YmFzZX0uLi57aGVhZH0iCiAgICBtYXBwZWQgPSB0YXNrX21hdGNoZXMocmVsZXZhbnQsIGNvbmZpZ1sidGFza3MiXSkKICAgIGZvciB0aXRsZSwgbWF0Y2hpbmcgaW4gbWFwcGVkLml0ZW1zKCk6CiAgICAgICAgY29udGVudCA9IHVwZGF0ZV90YXNrKAogICAgICAgICAgICBjb250ZW50LCB0aXRsZSwKICAgICAgICAgICAgZiJbU2hhcmVkLWJyYW5jaCBjaGFuZ2VdKHt1cmx9KSB0b3VjaGVkIHtsZW4obWF0Y2hpbmcpfSBtYXRjaGluZyBmaWxlKHMpLiAiCiAgICAgICAgICAgICJBY2NlcHRhbmNlIHByb29mIGlzIHN0aWxsIHJlcXVpcmVkLiIsCiAgICAgICAgKQogICAgdW5tYXRjaGVkID0gbGVuKHNldChyZWxldmFudCkgLSB7cGF0aCBmb3IgbWF0Y2hlcyBpbiBtYXBwZWQudmFsdWVzKCkgZm9yIHBhdGggaW4gbWF0Y2hlc30pCiAgICBhcmVhcyA9ICIsICIuam9pbihtYXBwZWQpIG9yICJVbm1hcHBlZCBjb2RlIGFjdGl2aXR5IgogICAgZXh0cmEgPSBmIjsge3VubWF0Y2hlZH0gZmlsZShzKSBuZWVkIHRhc2sgbWFwcGluZyIgaWYgdW5tYXRjaGVkIGVsc2UgIiIKICAgIGVudHJ5ID0gKAogICAgICAgIGYiLSBbU2hhcmVkLWJyYW5jaCBjb2RlIGNoYW5nZV0oe3VybH0pIOKAlCB7bGVuKHJlbGV2YW50KX0gY29kZSBmaWxlKHMpOyAiCiAgICAgICAgZiJ7YXJlYXN9e2V4dHJhfS4gVGhpcyByZWNvcmRzIGFjdGl2aXR5LCBub3QgcHJvZHVjdCBjb21wbGV0aW9uLiIKICAgICkKICAgIHN0YXJ0ID0gY29udGVudC5pbmRleChTVEFSVCkgKyBsZW4oU1RBUlQpCiAgICBlbmQgPSBjb250ZW50LmluZGV4KEVORCwgc3RhcnQpCiAgICBwcmV2aW91cyA9IFtsaW5lIGZvciBsaW5lIGluIGNvbnRlbnRbc3RhcnQ6ZW5kXS5zcGxpdGxpbmVzKCkgaWYgbGluZS5zdGFydHN3aXRoKCItICIpXQogICAgY29udGVudCA9IGNvbnRlbnRbOnN0YXJ0XSArICJcbiIgKyAiXG4iLmpvaW4oW2VudHJ5LCAqcHJldmlvdXNbOjE0XV0pICsgIlxuIiArIGNvbnRlbnRbZW5kOl0KICAgIHJldHVybiBTWU5DX1JFLnN1YihmIjwhLS0gdmlydHVhbC1wbS1zeW5jZWQ6IHtoZWFkfSAtLT4iLCBjb250ZW50LCBjb3VudD0xKQoKCmRlZiBzeW5jX2JyYW5jaChjb25maWc6IGRpY3QsIGF0dGVtcHRzOiBpbnQgPSA0KSAtPiBib29sOgogICAgaWYgb3MuZW52aXJvbi5nZXQoIkdJVEhVQl9BQ1RJT05TIikgIT0gInRydWUiIG9yIG9zLmVudmlyb24uZ2V0KAogICAgICAgICJHSVRIVUJfUkVQT1NJVE9SWSIKICAgICkgIT0gY29uZmlnWyJyZXBvc2l0b3J5Il06CiAgICAgICAgcmFpc2UgUnVudGltZUVycm9yKAogICAgICAgICAgICAiV29ya2xvb3Agc3luYyBvbmx5IHJ1bnMgaW4gR2l0SHViIEFjdGlvbnMgZm9yIHRoaXMgcmVwb3NpdG9yeSIKICAgICAgICApCiAgICBicmFuY2ggPSBjb25maWdbImJyYW5jaCJdCiAgICBwbGFuID0gUGF0aChjb25maWdbInBsYW4iXSkKICAgIGZvciBhdHRlbXB0IGluIHJhbmdlKGF0dGVtcHRzKToKICAgICAgICBnaXQoImZldGNoIiwgIi0tbm8tdGFncyIsICItLWZpbHRlcj1ibG9iOm5vbmUiLCAib3JpZ2luIiwgYnJhbmNoKQogICAgICAgIGdpdCgicmVzZXQiLCAiLS1oYXJkIiwgIkZFVENIX0hFQUQiKQogICAgICAgIGhlYWQgPSB2YWxpZGF0ZV9zaGEoZ2l0KCJyZXYtcGFyc2UiLCAiSEVBRCIpLnN0ZG91dC5zdHJpcCgpKQogICAgICAgIG9yaWdpbmFsID0gcGxhbi5yZWFkX3RleHQoKQogICAgICAgIG1hcmtlcnMgPSBTWU5DX1JFLmZpbmRhbGwob3JpZ2luYWwpCiAgICAgICAgaWYgbGVuKG1hcmtlcnMpICE9IDE6CiAgICAgICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIldvcmtsb29wIHN5bmMgbWFya2VyIGlzIG1pc3Npbmcgb3IgZHVwbGljYXRlZCIpCiAgICAgICAgdXBkYXRlZCA9IHJlbmRlcl9wbGFuKAogICAgICAgICAgICBvcmlnaW5hbCwgaGVhZCwgY2hhbmdlZF9wYXRocyhtYXJrZXJzWzBdLCBoZWFkKSwgY29uZmlnCiAgICAgICAgKQogICAgICAgIGlmIHVwZGF0ZWQgPT0gb3JpZ2luYWw6CiAgICAgICAgICAgIHJldHVybiBGYWxzZQogICAgICAgIHBsYW4ud3JpdGVfdGV4dCh1cGRhdGVkKQogICAgICAgIGdpdCgiYWRkIiwgIi0tIiwgc3RyKHBsYW4pKQogICAgICAgIGdpdCgiY29uZmlnIiwgInVzZXIubmFtZSIsICJnaXRodWItYWN0aW9uc1tib3RdIikKICAgICAgICBnaXQoImNvbmZpZyIsICJ1c2VyLmVtYWlsIiwgIjQxODk4MjgyK2dpdGh1Yi1hY3Rpb25zW2JvdF1AdXNlcnMubm9yZXBseS5naXRodWIuY29tIikKICAgICAgICBnaXQoImNvbW1pdCIsICItbSIsICJTeW5jIFdvcmtsb29wIGNvZGUgYWN0aXZpdHkiKQogICAgICAgIHB1c2hlZCA9IGdpdCgicHVzaCIsICJvcmlnaW4iLCBmIkhFQUQ6cmVmcy9oZWFkcy97YnJhbmNofSIsIGNoZWNrPUZhbHNlKQogICAgICAgIGlmIHB1c2hlZC5yZXR1cm5jb2RlID09IDA6CiAgICAgICAgICAgIHJldHVybiBUcnVlCiAgICAgICAgaWYgYXR0ZW1wdCA9PSBhdHRlbXB0cyAtIDE6CiAgICAgICAgICAgIHJhaXNlIFJ1bnRpbWVFcnJvcigiV29ya2xvb3AgY291bGQgbm90IHB1c2g7IGNoZWNrIGJyYW5jaCB3cml0ZSBwZXJtaXNzaW9ucyIpCiAgICAgICAgdGltZS5zbGVlcCgyICoqIGF0dGVtcHQpCiAgICByZXR1cm4gRmFsc2UKCgppZiBfX25hbWVfXyA9PSAiX19tYWluX18iOgogICAgc3luY19icmFuY2gobG9hZF9jb25maWcoKSkK"


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args], check=True, text=True, capture_output=True
    )
    return result.stdout.strip()


def repository_root() -> Path:
    try:
        return Path(git("rev-parse", "--show-toplevel"))
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        raise ValueError("Run this inside a Git repository") from exc


def current_branch() -> str:
    branch = git("symbolic-ref", "--quiet", "--short", "HEAD")
    validate_branch(branch)
    return branch


def validate_branch(branch: str) -> None:
    if not branch or branch.startswith("-") or "\n" in branch:
        raise ValueError("Choose a named Git branch")
    result = subprocess.run(
        ["git", "check-ref-format", "--branch", branch],
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise ValueError("The branch name is not a valid Git branch")


def github_repository() -> str:
    origin = git("remote", "get-url", "origin")
    matches = (
        re.fullmatch(r"https://github\.com/([^/]+/[^/]+?)(?:\.git)?", origin),
        re.fullmatch(r"git@github\.com:([^/]+/[^/]+?)(?:\.git)?", origin),
        re.fullmatch(r"ssh://git@github\.com/([^/]+/[^/]+?)(?:\.git)?", origin),
    )
    for match in matches:
        if match and REPO_RE.fullmatch(match.group(1)):
            return match.group(1)
    raise ValueError("The origin remote must be a github.com repository")


def plan_template(base_sha: str) -> str:
    return f"""# Workloop — a plan that moves with the work

This is the project’s shared plan. A commit-triggered workflow records code
activity here. A code change is **not** proof that a feature works or is Done.
Keep product decisions and acceptance evidence explicit.

## What we are making

**Goal:** Describe the experience and who it helps.

**First proof:** Describe the smallest result someone can test.

## Tasks

Add a task heading, owner, state, next check, and evidence. Then map its code
paths in `.virtual-pm.json` so pushes update its code-activity line.

### First proof

**Owner:** To decide.

**State:** Open.

**Next check:** Describe one observable test.

**Evidence:** None yet.

**Latest code activity (automatic):** None yet.

## Decisions

Record the choice, reason, and who made it. A commit cannot decide product policy.

## Questions and blockers

Record the next step and who can resolve it.

## Automatic code activity

<!-- virtual-pm-activity:start -->
No shared-branch code activity recorded yet.
<!-- virtual-pm-activity:end -->

<!-- virtual-pm-synced: {base_sha} -->
"""


def config_template(branch: str, repo: str) -> str:
    return json.dumps(
        {
            "version": 1,
            "branch": branch,
            "repository": repo,
            "plan": str(PLAN_PATH),
            "tasks": {"First proof": []},
        },
        indent=2,
    ) + "\n"


def workflow_template(branch: str, *, legacy: bool = False) -> str:
    # JSON double quotes are valid YAML scalars and safely quote branch syntax.
    branch_literal = json.dumps(branch)
    title = "Virtual PM activity" if legacy else "Workloop activity"
    return f"""name: {title}

on:
  push:
    branches:
      - {branch_literal}

permissions:
  contents: write

concurrency:
  group: virtual-pm-${{{{ github.ref }}}}
  cancel-in-progress: false

jobs:
  sync:
    if: github.actor != 'github-actions[bot]'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          ref: {branch_literal}
          fetch-depth: 0
          persist-credentials: true
      - name: Record branch code activity
        run: python3 .github/scripts/virtual_pm_sync.py
"""


def sync_template() -> str:
    # A release bundles the script as base64 in this one-file installer. The
    # source checkout reads the sibling file for convenient development.
    if not SYNC_PAYLOAD.startswith("@@"):
        return base64.b64decode(SYNC_PAYLOAD).decode("utf-8")
    return (Path(__file__).parent / "virtual_pm_sync.py").read_text()


def desired_files(branch: str, repo: str, base_sha: str) -> dict[Path, str]:
    return {
        PLAN_PATH: plan_template(base_sha),
        CONFIG_PATH: config_template(branch, repo),
        WORKFLOW_PATH: workflow_template(branch),
        SYNC_PATH: sync_template(),
    }


def install(dry_run: bool) -> None:
    root = repository_root()
    branch = current_branch()
    repo = github_repository()
    if all((root / path).exists() for path in FILES):
        verify()
        print("Workloop is already installed; existing project content was preserved.")
        return
    base_sha = git("rev-parse", "HEAD")
    if not re.fullmatch(r"[0-9a-f]{40}", base_sha):
        raise ValueError("Could not read a full Git commit ID")
    files = desired_files(branch, repo, base_sha)

    conflicts = [
        path for path, content in files.items()
        if (root / path).exists() and (root / path).read_text() != content
    ]
    if conflicts:
        names = ", ".join(str(path) for path in conflicts)
        raise ValueError(f"Existing files differ; no files changed: {names}")

    for path, content in files.items():
        state = "already installed" if (root / path).exists() else "create"
        print(f"{state}: {path}")
        if not dry_run and state == "create":
            (root / path).parent.mkdir(parents=True, exist_ok=True)
            (root / path).write_text(content)

    if dry_run:
        print("Dry run only; no files changed.")
    else:
        print("Installed locally. Review the files, then commit and push this branch.")
        print("GitHub Actions must permit workflow writes for automatic updates.")


def verify(*, announce: bool = True) -> dict[Path, str]:
    root = repository_root()
    missing = [str(path) for path in FILES if not (root / path).is_file()]
    if missing:
        raise ValueError("Missing Workloop files: " + ", ".join(missing))
    config = json.loads((root / CONFIG_PATH).read_text())
    if config.get("version") != 1 or config.get("repository") != github_repository():
        raise ValueError("Workloop configuration does not match this GitHub repository")
    validate_branch(config.get("branch", ""))
    # These two files are generated by this installer. The plan and task map
    # belong to the project and may change, but a modified updater or workflow
    # must be reviewed explicitly before a rerun can claim consistency.
    managed = {
        WORKFLOW_PATH: workflow_template(config["branch"]),
        SYNC_PATH: sync_template(),
    }
    legacy_workflow = workflow_template(config["branch"], legacy=True).encode("utf-8")
    versions = {}
    drifted = []
    for path, expected in managed.items():
        actual = (root / path).read_bytes()
        if actual == expected.encode("utf-8"):
            versions[path] = "current"
        elif path == WORKFLOW_PATH and actual == legacy_workflow:
            versions[path] = "legacy"
        elif path == SYNC_PATH and hashlib.sha256(actual).hexdigest() == LEGACY_SYNC_SHA256:
            versions[path] = "legacy"
        else:
            drifted.append(path)
    if drifted:
        names = ", ".join(str(path) for path in drifted)
        raise ValueError(
            "Managed Workloop files differ from this installer; no files changed: "
            f"{names}. Review and merge those changes deliberately, then rerun verify."
        )
    plan = (root / PLAN_PATH).read_text()
    if not re.search(r"<!-- virtual-pm-synced: [0-9a-f]{40} -->", plan):
        raise ValueError("Workloop plan has no valid sync marker")
    if plan.count("<!-- virtual-pm-activity:start -->") != 1 or plan.count(
        "<!-- virtual-pm-activity:end -->"
    ) != 1:
        raise ValueError("Workloop plan has invalid activity markers")
    if announce:
        print("Workloop files are installed and consistent locally.")
        if "legacy" in versions.values():
            print("Legacy generated labels remain. Run install.py migrate-labels to update managed files.")
        if not any(config.get("tasks", {}).values()):
            print("No task paths are mapped yet; automatic task status cannot update until they are.")
        print("A live GitHub push is still needed to verify the workflow trigger.")
    return versions


def migrate_labels(dry_run: bool) -> None:
    root = repository_root()
    versions = verify(announce=False)
    config = json.loads((root / CONFIG_PATH).read_text())
    current = {
        WORKFLOW_PATH: workflow_template(config["branch"]),
        SYNC_PATH: sync_template(),
    }
    pending = [path for path, version in versions.items() if version == "legacy"]
    if not pending:
        print("Workloop generated labels are already current; no files changed.")
        return
    for path in pending:
        print(("Would update" if dry_run else "Updating") + f" {path}")
        if not dry_run:
            (root / path).write_bytes(current[path].encode("utf-8"))
    if dry_run:
        print("Dry run only; no files changed.")
    else:
        verify()
        print("Managed labels updated. Review and commit these files deliberately.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("init", "verify", "migrate-labels"))
    parser.add_argument("--dry-run", action="store_true", help="show local writes")
    args = parser.parse_args()
    try:
        if args.command == "init":
            install(args.dry_run)
        elif args.command == "migrate-labels":
            migrate_labels(args.dry_run)
        else:
            verify()
    except (ValueError, subprocess.CalledProcessError, OSError, json.JSONDecodeError) as exc:
        parser.exit(1, f"Workloop: {exc}\n")


if __name__ == "__main__":
    main()
