#!/usr/bin/env python3
"""Install a branch-scoped Virtual PM starter into the current GitHub repository.

This installer only writes local files. It never commits, pushes, or asks for a
credential. The installed workflow records code activity after a branch push;
it does not infer that product acceptance criteria passed.
"""

from __future__ import annotations

import argparse
import base64
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
REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
SYNC_PAYLOAD = "IyEvdXNyL2Jpbi9lbnYgcHl0aG9uMwoiIiJSZWNvcmQgc2hhcmVkLWJyYW5jaCBjb2RlIGFjdGl2aXR5IGluIFZJUlRVQUxfUE0ubWQgYWZ0ZXIgR2l0SHViIHB1c2hlcy4KCk9ubHkgYWN0aXZpdHkgYW5kIGEgbWFwcGVkIHRhc2sncyBXb3JraW5nIHN0YXRlIGFyZSBpbmZlcnJlZCBmcm9tIGNoYW5nZWQgY29kZS4KVGhpcyBuZXZlciBtYXJrcyBhIHRhc2sgRG9uZSBvciBjaGFuZ2VzIHByb2R1Y3QgZGVjaXNpb25zIG9yIGFjY2VwdGFuY2UgcHJvb2YuCiIiIgoKZnJvbSBfX2Z1dHVyZV9fIGltcG9ydCBhbm5vdGF0aW9ucwoKaW1wb3J0IGpzb24KaW1wb3J0IG9zCmZyb20gZm5tYXRjaCBpbXBvcnQgZm5tYXRjaApmcm9tIHBhdGhsaWIgaW1wb3J0IFBhdGgKaW1wb3J0IHJlCmltcG9ydCBzdWJwcm9jZXNzCmltcG9ydCB0aW1lCgoKQ09ORklHX1BBVEggPSBQYXRoKCIudmlydHVhbC1wbS5qc29uIikKU1lOQ19SRSA9IHJlLmNvbXBpbGUociI8IS0tIHZpcnR1YWwtcG0tc3luY2VkOiAoWzAtOWEtZl17NDB9KSAtLT4iKQpTVEFSVCA9ICI8IS0tIHZpcnR1YWwtcG0tYWN0aXZpdHk6c3RhcnQgLS0+IgpFTkQgPSAiPCEtLSB2aXJ0dWFsLXBtLWFjdGl2aXR5OmVuZCAtLT4iCkxBVEVTVCA9ICIqKkxhdGVzdCBjb2RlIGFjdGl2aXR5IChhdXRvbWF0aWMpOioqIgpTSEFfUkUgPSByZS5jb21waWxlKHIiWzAtOWEtZl17NDB9XFoiKQpSRVBPX1JFID0gcmUuY29tcGlsZShyIltBLVphLXowLTlfLi1dKy9bQS1aYS16MC05Xy4tXStcWiIpCklHTk9SRURfU1VGRklYRVMgPSAoIi5tZCIsICIubG9jayIpCklHTk9SRURfTkFNRVMgPSB7InBhY2thZ2UtbG9jay5qc29uIiwgIm5wbS1zaHJpbmt3cmFwLmpzb24iLCAieWFybi5sb2NrIiwgInBucG0tbG9jay55YW1sIn0KCgpkZWYgZ2l0KCphcmdzOiBzdHIsIGNoZWNrOiBib29sID0gVHJ1ZSkgLT4gc3VicHJvY2Vzcy5Db21wbGV0ZWRQcm9jZXNzW3N0cl06CiAgICByZXR1cm4gc3VicHJvY2Vzcy5ydW4oCiAgICAgICAgWyJnaXQiLCAqYXJnc10sIGNoZWNrPWNoZWNrLCBjYXB0dXJlX291dHB1dD1UcnVlLCB0ZXh0PVRydWUKICAgICkKCgpkZWYgdmFsaWRhdGVfc2hhKHNoYTogc3RyKSAtPiBzdHI6CiAgICBpZiBub3QgU0hBX1JFLmZ1bGxtYXRjaChzaGEpOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIkludmFsaWQgVmlydHVhbCBQTSBzeW5jIHJldmlzaW9uIikKICAgIHJldHVybiBzaGEKCgpkZWYgbG9hZF9jb25maWcoKSAtPiBkaWN0OgogICAgY29uZmlnID0ganNvbi5sb2FkcyhDT05GSUdfUEFUSC5yZWFkX3RleHQoKSkKICAgIGlmIGNvbmZpZy5nZXQoInZlcnNpb24iKSAhPSAxOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIlVuc3VwcG9ydGVkIFZpcnR1YWwgUE0gY29uZmlndXJhdGlvbiIpCiAgICBpZiBub3QgUkVQT19SRS5mdWxsbWF0Y2goY29uZmlnLmdldCgicmVwb3NpdG9yeSIsICIiKSk6CiAgICAgICAgcmFpc2UgVmFsdWVFcnJvcigiSW52YWxpZCBHaXRIdWIgcmVwb3NpdG9yeSBpbiBWaXJ0dWFsIFBNIGNvbmZpZ3VyYXRpb24iKQogICAgYnJhbmNoID0gY29uZmlnLmdldCgiYnJhbmNoIikKICAgIGlmIG5vdCBpc2luc3RhbmNlKGJyYW5jaCwgc3RyKSBvciBub3QgYnJhbmNoIG9yICJcbiIgaW4gYnJhbmNoOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIkludmFsaWQgYnJhbmNoIGluIFZpcnR1YWwgUE0gY29uZmlndXJhdGlvbiIpCiAgICBpZiBnaXQoImNoZWNrLXJlZi1mb3JtYXQiLCAiLS1icmFuY2giLCBicmFuY2gsIGNoZWNrPUZhbHNlKS5yZXR1cm5jb2RlOgogICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIkludmFsaWQgR2l0IGJyYW5jaCBpbiBWaXJ0dWFsIFBNIGNvbmZpZ3VyYXRpb24iKQogICAgcGxhbiA9IGNvbmZpZy5nZXQoInBsYW4iKQogICAgaWYgcGxhbiAhPSAiVklSVFVBTF9QTS5tZCI6CiAgICAgICAgcmFpc2UgVmFsdWVFcnJvcigiVW5leHBlY3RlZCBWaXJ0dWFsIFBNIHBsYW4gcGF0aCIpCiAgICB0YXNrcyA9IGNvbmZpZy5nZXQoInRhc2tzIikKICAgIGlmIG5vdCBpc2luc3RhbmNlKHRhc2tzLCBkaWN0KToKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJWaXJ0dWFsIFBNIHRhc2sgbWFwIG11c3QgYmUgYW4gb2JqZWN0IikKICAgIGZvciB0aXRsZSwgcGF0dGVybnMgaW4gdGFza3MuaXRlbXMoKToKICAgICAgICBpZiBub3QgaXNpbnN0YW5jZSh0aXRsZSwgc3RyKSBvciBub3QgaXNpbnN0YW5jZShwYXR0ZXJucywgbGlzdCkgb3Igbm90IGFsbCgKICAgICAgICAgICAgaXNpbnN0YW5jZShwYXR0ZXJuLCBzdHIpIGZvciBwYXR0ZXJuIGluIHBhdHRlcm5zCiAgICAgICAgKToKICAgICAgICAgICAgcmFpc2UgVmFsdWVFcnJvcigiVmlydHVhbCBQTSB0YXNrIG1hcHBpbmcgaXMgbWFsZm9ybWVkIikKICAgIHJldHVybiBjb25maWcKCgpkZWYgY2hhbmdlZF9wYXRocyhiYXNlOiBzdHIsIGhlYWQ6IHN0cikgLT4gbGlzdFtzdHJdOgogICAgdmFsaWRhdGVfc2hhKGJhc2UpCiAgICB2YWxpZGF0ZV9zaGEoaGVhZCkKICAgIGlmIGdpdCgiY2F0LWZpbGUiLCAiLWUiLCBmIntiYXNlfV57e2NvbW1pdH19IiwgY2hlY2s9RmFsc2UpLnJldHVybmNvZGU6CiAgICAgICAgZ2l0KCJmZXRjaCIsICItLW5vLXRhZ3MiLCAiLS1maWx0ZXI9YmxvYjpub25lIiwgIi0tZGVwdGg9MSIsICJvcmlnaW4iLCBiYXNlKQogICAgaWYgZ2l0KCJtZXJnZS1iYXNlIiwgIi0taXMtYW5jZXN0b3IiLCBiYXNlLCBoZWFkLCBjaGVjaz1GYWxzZSkucmV0dXJuY29kZToKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJWaXJ0dWFsIFBNIG1hcmtlciBpcyBub3QgYW4gYW5jZXN0b3Igb2YgdGhpcyBicmFuY2giKQogICAgcmVzdWx0ID0gZ2l0KCJkaWZmIiwgIi0tbmFtZS1vbmx5IiwgIi0tZGlmZi1maWx0ZXI9QUNNUkQiLCBiYXNlLCBoZWFkLCAiLS0iKQogICAgcmV0dXJuIHNvcnRlZChzZXQocmVzdWx0LnN0ZG91dC5zcGxpdGxpbmVzKCkpKQoKCmRlZiBjb2RlX3BhdGhzKHBhdGhzOiBsaXN0W3N0cl0pIC0+IGxpc3Rbc3RyXToKICAgIHJldHVybiBbCiAgICAgICAgcGF0aCBmb3IgcGF0aCBpbiBwYXRocwogICAgICAgIGlmIG5vdCBwYXRoLnN0YXJ0c3dpdGgoIi5naXRodWIvIikKICAgICAgICBhbmQgbm90IHBhdGguc3RhcnRzd2l0aCgiLnZpcnR1YWwtcG0iKQogICAgICAgIGFuZCBwYXRoICE9ICJWSVJUVUFMX1BNLm1kIgogICAgICAgIGFuZCBQYXRoKHBhdGgpLm5hbWUgbm90IGluIElHTk9SRURfTkFNRVMKICAgICAgICBhbmQgbm90IHBhdGguZW5kc3dpdGgoSUdOT1JFRF9TVUZGSVhFUykKICAgIF0KCgpkZWYgdGFza19tYXRjaGVzKHBhdGhzOiBsaXN0W3N0cl0sIHRhc2tzOiBkaWN0W3N0ciwgbGlzdFtzdHJdXSkgLT4gZGljdFtzdHIsIGxpc3Rbc3RyXV06CiAgICByZXR1cm4gewogICAgICAgIHRpdGxlOiBbcGF0aCBmb3IgcGF0aCBpbiBwYXRocyBpZiBhbnkoZm5tYXRjaChwYXRoLCBwYXR0ZXJuKSBmb3IgcGF0dGVybiBpbiBwYXR0ZXJucyldCiAgICAgICAgZm9yIHRpdGxlLCBwYXR0ZXJucyBpbiB0YXNrcy5pdGVtcygpCiAgICAgICAgaWYgYW55KGFueShmbm1hdGNoKHBhdGgsIHBhdHRlcm4pIGZvciBwYXR0ZXJuIGluIHBhdHRlcm5zKSBmb3IgcGF0aCBpbiBwYXRocykKICAgIH0KCgpkZWYgdXBkYXRlX3Rhc2soY29udGVudDogc3RyLCB0aXRsZTogc3RyLCBhY3Rpdml0eTogc3RyKSAtPiBzdHI6CiAgICBoZWFkaW5nID0gZiIjIyMge3RpdGxlfVxuIgogICAgc3RhcnRfYXQgPSBjb250ZW50LmZpbmQoIiMjIFRhc2tzIikKICAgIGlmIHN0YXJ0X2F0IDwgMDoKICAgICAgICByYWlzZSBWYWx1ZUVycm9yKCJWaXJ0dWFsIFBNIHBsYW4gaGFzIG5vIFRhc2tzIHNlY3Rpb24iKQogICAgc3RhcnQgPSBjb250ZW50LmZpbmQoaGVhZGluZywgc3RhcnRfYXQpCiAgICBpZiBzdGFydCA8IDA6CiAgICAgICAgcmFpc2UgVmFsdWVFcnJvcihmIlZpcnR1YWwgUE0gdGFzayBoZWFkaW5nIGlzIG1pc3Npbmc6IHt0aXRsZX0iKQogICAgZW5kID0gY29udGVudC5maW5kKCJcbiMjICIsIHN0YXJ0ICsgbGVuKGhlYWRpbmcpKQogICAgb3RoZXJfdGFzayA9IGNvbnRlbnQuZmluZCgiXG4jIyMgIiwgc3RhcnQgKyBsZW4oaGVhZGluZykpCiAgICBpZiBlbmQgPCAwIG9yIChvdGhlcl90YXNrID49IDAgYW5kIG90aGVyX3Rhc2sgPCBlbmQpOgogICAgICAgIGVuZCA9IG90aGVyX3Rhc2sKICAgIGlmIGVuZCA8IDA6CiAgICAgICAgcmFpc2UgVmFsdWVFcnJvcihmIlZpcnR1YWwgUE0gdGFzayBoYXMgbm8gY2xvc2luZyBoZWFkaW5nOiB7dGl0bGV9IikKICAgIGJsb2NrID0gY29udGVudFtzdGFydDplbmRdCiAgICBpZiBibG9jay5jb3VudChMQVRFU1QpICE9IDE6CiAgICAgICAgcmFpc2UgVmFsdWVFcnJvcihmIlZpcnR1YWwgUE0gdGFzayBtdXN0IGhhdmUgb25lIGFjdGl2aXR5IGxpbmU6IHt0aXRsZX0iKQogICAgYmxvY2sgPSByZS5zdWIoCiAgICAgICAgciJeXCpcKkxhdGVzdCBjb2RlIGFjdGl2aXR5IFwoYXV0b21hdGljXCk6XCpcKi4qJCIsCiAgICAgICAgZiJ7TEFURVNUfSB7YWN0aXZpdHl9IiwgYmxvY2ssIGNvdW50PTEsIGZsYWdzPXJlLk1VTFRJTElORSwKICAgICkKICAgIGJsb2NrID0gcmUuc3ViKAogICAgICAgIHIiXlwqXCpTdGF0ZTpcKlwqICg/Ok9wZW58VG8gZG8pXC4/JCIsCiAgICAgICAgIioqU3RhdGU6KiogV29ya2luZyDigJQgY29kZSBjaGFuZ2VkOyBhY2NlcHRhbmNlIHByb29mIHBlbmRpbmcuIiwKICAgICAgICBibG9jaywgY291bnQ9MSwgZmxhZ3M9cmUuTVVMVElMSU5FLAogICAgKQogICAgcmV0dXJuIGNvbnRlbnRbOnN0YXJ0XSArIGJsb2NrICsgY29udGVudFtlbmQ6XQoKCmRlZiByZW5kZXJfcGxhbihjb250ZW50OiBzdHIsIGhlYWQ6IHN0ciwgcGF0aHM6IGxpc3Rbc3RyXSwgY29uZmlnOiBkaWN0KSAtPiBzdHI6CiAgICB2YWxpZGF0ZV9zaGEoaGVhZCkKICAgIG1hcmtlcnMgPSBTWU5DX1JFLmZpbmRhbGwoY29udGVudCkKICAgIGlmIGxlbihtYXJrZXJzKSAhPSAxIG9yIGNvbnRlbnQuY291bnQoU1RBUlQpICE9IDEgb3IgY29udGVudC5jb3VudChFTkQpICE9IDE6CiAgICAgICAgcmFpc2UgVmFsdWVFcnJvcigiVmlydHVhbCBQTSBwbGFuIGhhcyBtaXNzaW5nIG9yIGR1cGxpY2F0ZSBzeW5jIG1hcmtlcnMiKQogICAgYmFzZSA9IG1hcmtlcnNbMF0KICAgIGlmIGJhc2UgPT0gaGVhZDoKICAgICAgICByZXR1cm4gY29udGVudAogICAgcmVsZXZhbnQgPSBjb2RlX3BhdGhzKHBhdGhzKQogICAgaWYgbm90IHJlbGV2YW50OgogICAgICAgIHJldHVybiBjb250ZW50CiAgICB1cmwgPSBmImh0dHBzOi8vZ2l0aHViLmNvbS97Y29uZmlnWydyZXBvc2l0b3J5J119L2NvbXBhcmUve2Jhc2V9Li4ue2hlYWR9IgogICAgbWFwcGVkID0gdGFza19tYXRjaGVzKHJlbGV2YW50LCBjb25maWdbInRhc2tzIl0pCiAgICBmb3IgdGl0bGUsIG1hdGNoaW5nIGluIG1hcHBlZC5pdGVtcygpOgogICAgICAgIGNvbnRlbnQgPSB1cGRhdGVfdGFzaygKICAgICAgICAgICAgY29udGVudCwgdGl0bGUsCiAgICAgICAgICAgIGYiW1NoYXJlZC1icmFuY2ggY2hhbmdlXSh7dXJsfSkgdG91Y2hlZCB7bGVuKG1hdGNoaW5nKX0gbWF0Y2hpbmcgZmlsZShzKS4gIgogICAgICAgICAgICAiQWNjZXB0YW5jZSBwcm9vZiBpcyBzdGlsbCByZXF1aXJlZC4iLAogICAgICAgICkKICAgIHVubWF0Y2hlZCA9IGxlbihzZXQocmVsZXZhbnQpIC0ge3BhdGggZm9yIG1hdGNoZXMgaW4gbWFwcGVkLnZhbHVlcygpIGZvciBwYXRoIGluIG1hdGNoZXN9KQogICAgYXJlYXMgPSAiLCAiLmpvaW4obWFwcGVkKSBvciAiVW5tYXBwZWQgY29kZSBhY3Rpdml0eSIKICAgIGV4dHJhID0gZiI7IHt1bm1hdGNoZWR9IGZpbGUocykgbmVlZCB0YXNrIG1hcHBpbmciIGlmIHVubWF0Y2hlZCBlbHNlICIiCiAgICBlbnRyeSA9ICgKICAgICAgICBmIi0gW1NoYXJlZC1icmFuY2ggY29kZSBjaGFuZ2VdKHt1cmx9KSDigJQge2xlbihyZWxldmFudCl9IGNvZGUgZmlsZShzKTsgIgogICAgICAgIGYie2FyZWFzfXtleHRyYX0uIFRoaXMgcmVjb3JkcyBhY3Rpdml0eSwgbm90IHByb2R1Y3QgY29tcGxldGlvbi4iCiAgICApCiAgICBzdGFydCA9IGNvbnRlbnQuaW5kZXgoU1RBUlQpICsgbGVuKFNUQVJUKQogICAgZW5kID0gY29udGVudC5pbmRleChFTkQsIHN0YXJ0KQogICAgcHJldmlvdXMgPSBbbGluZSBmb3IgbGluZSBpbiBjb250ZW50W3N0YXJ0OmVuZF0uc3BsaXRsaW5lcygpIGlmIGxpbmUuc3RhcnRzd2l0aCgiLSAiKV0KICAgIGNvbnRlbnQgPSBjb250ZW50WzpzdGFydF0gKyAiXG4iICsgIlxuIi5qb2luKFtlbnRyeSwgKnByZXZpb3VzWzoxNF1dKSArICJcbiIgKyBjb250ZW50W2VuZDpdCiAgICByZXR1cm4gU1lOQ19SRS5zdWIoZiI8IS0tIHZpcnR1YWwtcG0tc3luY2VkOiB7aGVhZH0gLS0+IiwgY29udGVudCwgY291bnQ9MSkKCgpkZWYgc3luY19icmFuY2goY29uZmlnOiBkaWN0LCBhdHRlbXB0czogaW50ID0gNCkgLT4gYm9vbDoKICAgIGlmIG9zLmVudmlyb24uZ2V0KCJHSVRIVUJfQUNUSU9OUyIpICE9ICJ0cnVlIiBvciBvcy5lbnZpcm9uLmdldCgKICAgICAgICAiR0lUSFVCX1JFUE9TSVRPUlkiCiAgICApICE9IGNvbmZpZ1sicmVwb3NpdG9yeSJdOgogICAgICAgIHJhaXNlIFJ1bnRpbWVFcnJvcigKICAgICAgICAgICAgIlZpcnR1YWwgUE0gc3luYyBvbmx5IHJ1bnMgaW4gR2l0SHViIEFjdGlvbnMgZm9yIHRoaXMgcmVwb3NpdG9yeSIKICAgICAgICApCiAgICBicmFuY2ggPSBjb25maWdbImJyYW5jaCJdCiAgICBwbGFuID0gUGF0aChjb25maWdbInBsYW4iXSkKICAgIGZvciBhdHRlbXB0IGluIHJhbmdlKGF0dGVtcHRzKToKICAgICAgICBnaXQoImZldGNoIiwgIi0tbm8tdGFncyIsICItLWZpbHRlcj1ibG9iOm5vbmUiLCAib3JpZ2luIiwgYnJhbmNoKQogICAgICAgIGdpdCgicmVzZXQiLCAiLS1oYXJkIiwgIkZFVENIX0hFQUQiKQogICAgICAgIGhlYWQgPSB2YWxpZGF0ZV9zaGEoZ2l0KCJyZXYtcGFyc2UiLCAiSEVBRCIpLnN0ZG91dC5zdHJpcCgpKQogICAgICAgIG9yaWdpbmFsID0gcGxhbi5yZWFkX3RleHQoKQogICAgICAgIG1hcmtlcnMgPSBTWU5DX1JFLmZpbmRhbGwob3JpZ2luYWwpCiAgICAgICAgaWYgbGVuKG1hcmtlcnMpICE9IDE6CiAgICAgICAgICAgIHJhaXNlIFZhbHVlRXJyb3IoIlZpcnR1YWwgUE0gc3luYyBtYXJrZXIgaXMgbWlzc2luZyBvciBkdXBsaWNhdGVkIikKICAgICAgICB1cGRhdGVkID0gcmVuZGVyX3BsYW4oCiAgICAgICAgICAgIG9yaWdpbmFsLCBoZWFkLCBjaGFuZ2VkX3BhdGhzKG1hcmtlcnNbMF0sIGhlYWQpLCBjb25maWcKICAgICAgICApCiAgICAgICAgaWYgdXBkYXRlZCA9PSBvcmlnaW5hbDoKICAgICAgICAgICAgcmV0dXJuIEZhbHNlCiAgICAgICAgcGxhbi53cml0ZV90ZXh0KHVwZGF0ZWQpCiAgICAgICAgZ2l0KCJhZGQiLCAiLS0iLCBzdHIocGxhbikpCiAgICAgICAgZ2l0KCJjb25maWciLCAidXNlci5uYW1lIiwgImdpdGh1Yi1hY3Rpb25zW2JvdF0iKQogICAgICAgIGdpdCgiY29uZmlnIiwgInVzZXIuZW1haWwiLCAiNDE4OTgyODIrZ2l0aHViLWFjdGlvbnNbYm90XUB1c2Vycy5ub3JlcGx5LmdpdGh1Yi5jb20iKQogICAgICAgIGdpdCgiY29tbWl0IiwgIi1tIiwgIlN5bmMgVmlydHVhbCBQTSBjb2RlIGFjdGl2aXR5IikKICAgICAgICBwdXNoZWQgPSBnaXQoInB1c2giLCAib3JpZ2luIiwgZiJIRUFEOnJlZnMvaGVhZHMve2JyYW5jaH0iLCBjaGVjaz1GYWxzZSkKICAgICAgICBpZiBwdXNoZWQucmV0dXJuY29kZSA9PSAwOgogICAgICAgICAgICByZXR1cm4gVHJ1ZQogICAgICAgIGlmIGF0dGVtcHQgPT0gYXR0ZW1wdHMgLSAxOgogICAgICAgICAgICByYWlzZSBSdW50aW1lRXJyb3IoIlZpcnR1YWwgUE0gY291bGQgbm90IHB1c2g7IGNoZWNrIGJyYW5jaCB3cml0ZSBwZXJtaXNzaW9ucyIpCiAgICAgICAgdGltZS5zbGVlcCgyICoqIGF0dGVtcHQpCiAgICByZXR1cm4gRmFsc2UKCgppZiBfX25hbWVfXyA9PSAiX19tYWluX18iOgogICAgc3luY19icmFuY2gobG9hZF9jb25maWcoKSkK"


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
    return f"""# Virtual PM — a plan that moves with the work

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


def workflow_template(branch: str) -> str:
    # JSON double quotes are valid YAML scalars and safely quote branch syntax.
    branch_literal = json.dumps(branch)
    return f"""name: Virtual PM activity

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
        print("Virtual PM is already installed; existing project content was preserved.")
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


def verify() -> None:
    root = repository_root()
    missing = [str(path) for path in FILES if not (root / path).is_file()]
    if missing:
        raise ValueError("Missing Virtual PM files: " + ", ".join(missing))
    config = json.loads((root / CONFIG_PATH).read_text())
    if config.get("version") != 1 or config.get("repository") != github_repository():
        raise ValueError("Virtual PM configuration does not match this GitHub repository")
    validate_branch(config.get("branch", ""))
    # These two files are generated by this installer. The plan and task map
    # belong to the project and may change, but a modified updater or workflow
    # must be reviewed explicitly before a rerun can claim consistency.
    managed = {
        WORKFLOW_PATH: workflow_template(config["branch"]),
        SYNC_PATH: sync_template(),
    }
    drifted = [
        path for path, expected in managed.items()
        if (root / path).read_bytes() != expected.encode("utf-8")
    ]
    if drifted:
        names = ", ".join(str(path) for path in drifted)
        raise ValueError(
            "Managed Virtual PM files differ from this installer; no files changed: "
            f"{names}. Review and merge those changes deliberately, then rerun verify."
        )
    plan = (root / PLAN_PATH).read_text()
    if not re.search(r"<!-- virtual-pm-synced: [0-9a-f]{40} -->", plan):
        raise ValueError("Virtual PM plan has no valid sync marker")
    if plan.count("<!-- virtual-pm-activity:start -->") != 1 or plan.count(
        "<!-- virtual-pm-activity:end -->"
    ) != 1:
        raise ValueError("Virtual PM plan has invalid activity markers")
    print("Virtual PM files are installed and consistent locally.")
    if not any(config.get("tasks", {}).values()):
        print("No task paths are mapped yet; automatic task status cannot update until they are.")
    print("A live GitHub push is still needed to verify the workflow trigger.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("init", "verify"))
    parser.add_argument("--dry-run", action="store_true", help="show local writes")
    args = parser.parse_args()
    try:
        if args.command == "init":
            install(args.dry_run)
        else:
            verify()
    except (ValueError, subprocess.CalledProcessError, OSError, json.JSONDecodeError) as exc:
        parser.exit(1, f"Virtual PM: {exc}\n")


if __name__ == "__main__":
    main()
