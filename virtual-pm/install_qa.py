#!/usr/bin/env python3
"""Install Workloop checks beside an existing Workloop plan, without replacing project work."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys


MANIFEST = Path("VIRTUAL_QA_SCENARIOS.json")
RUNNER = Path(".github/scripts/virtual_qa_runner.mjs")
WORKFLOW = Path(".github/workflows/virtual-qa.yml")
PLAN = Path("VIRTUAL_PM.md")
PM_CONFIG = Path(".virtual-pm.json")
# Exact digest of the last published pre-Workloop QA runner.
LEGACY_RUNNER_SHA256 = "469cc279fc5defa2dc947196e528470f7fce28b6c32cdb8baa4c18f2bec428da"
RUNNER_PAYLOAD = "IyEvdXNyL2Jpbi9lbnYgbm9kZQoKaW1wb3J0IHsgZXhlY0ZpbGVTeW5jLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7CmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWxwYXRoU3luYyB9IGZyb20gJ25vZGU6ZnMnOwppbXBvcnQgeyBta2RpciwgcmVhZEZpbGUsIHdyaXRlRmlsZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnOwppbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnOwppbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnOwoKY29uc3QgaGVyZSA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpOwpjb25zdCBNQVhfTE9HX0JZVEVTID0gMjU2XzAwMDsKY29uc3QgTUFYX1RJTUVPVVRfTVMgPSAzMDBfMDAwOwoKLyoqIFJldHVybiB0aGUgbmFtZWQgc2VjdGlvbiBmcm9tIHRoZSBsaXZpbmcgcGxhbiB3aXRob3V0IGludGVycHJldGluZyBpdHMgc3RhdHVzLiAqLwpleHBvcnQgZnVuY3Rpb24gcmVhZFRhc2tCbG9ja3MgKG1hcmtkb3duKSB7CiAgY29uc3QgYmxvY2tzID0gbmV3IE1hcCgpOwogIGNvbnN0IHRhc2tzU3RhcnQgPSAvXiMjIFRhc2tzXHMqJC9tLmV4ZWMobWFya2Rvd24pOwogIGlmICghdGFza3NTdGFydCkgdGhyb3cgbmV3IEVycm9yKCdMaXZpbmcgcGxhbiBoYXMgbm8gVGFza3Mgc2VjdGlvbicpOwogIGNvbnN0IHNlY3Rpb25TdGFydCA9IHRhc2tzU3RhcnQuaW5kZXggKyB0YXNrc1N0YXJ0WzBdLmxlbmd0aDsKICBjb25zdCBuZXh0U2VjdGlvbiA9IC9eIyMgKD8hIykuKyQvbS5leGVjKG1hcmtkb3duLnNsaWNlKHNlY3Rpb25TdGFydCkpOwogIGNvbnN0IHRhc2tzID0gbWFya2Rvd24uc2xpY2Uoc2VjdGlvblN0YXJ0LCBuZXh0U2VjdGlvbiA/IHNlY3Rpb25TdGFydCArIG5leHRTZWN0aW9uLmluZGV4IDogdW5kZWZpbmVkKTsKICBjb25zdCBoZWFkZXJzID0gWy4uLnRhc2tzLm1hdGNoQWxsKC9eIyMjICguKykkL2dtKV07CiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGhlYWRlcnMubGVuZ3RoOyBpbmRleCArPSAxKSB7CiAgICBjb25zdCBoZWFkaW5nID0gaGVhZGVyc1tpbmRleF1bMV0udHJpbSgpOwogICAgY29uc3Qgc3RhcnQgPSBoZWFkZXJzW2luZGV4XS5pbmRleCArIGhlYWRlcnNbaW5kZXhdWzBdLmxlbmd0aDsKICAgIGNvbnN0IGVuZCA9IGhlYWRlcnNbaW5kZXggKyAxXT8uaW5kZXggPz8gdGFza3MubGVuZ3RoOwogICAgY29uc3QgYm9keSA9IHRhc2tzLnNsaWNlKHN0YXJ0LCBlbmQpOwogICAgYmxvY2tzLnNldChoZWFkaW5nLCB7CiAgICAgIHN0YXRlOiBib2R5Lm1hdGNoKC9eXCpcKlN0YXRlOlwqXCogKC4rKSQvbSk/LlsxXSA/PyAnTm90IHJlY29yZGVkJywKICAgICAgb3duZXI6IGJvZHkubWF0Y2goL15cKlwqT3duZXI6XCpcKiAoLispJC9tKT8uWzFdID8/ICdOb3QgYXNzaWduZWQnLAogICAgICBuZXh0UHJvb2Y6IGJvZHkubWF0Y2goL15cKlwqTmV4dCAoPzpwcm9vZnxjaGVjayk6XCpcKiAoLispJC9tKT8uWzFdID8/ICdOb3QgcmVjb3JkZWQnCiAgICB9KTsKICB9CiAgcmV0dXJuIGJsb2NrczsKfQoKLyoqIEtlZXAgc2NlbmFyaW8gcGF0aHMgaW5zaWRlIHRoZSBzZWxlY3RlZCByZXBvc2l0b3J5LiAqLwpleHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUluc2lkZSAocm9vdCwgcmVsYXRpdmVQYXRoKSB7CiAgaWYgKHBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZVBhdGgpKSB0aHJvdyBuZXcgRXJyb3IoYEFic29sdXRlIHBhdGggaXMgbm90IGFsbG93ZWQ6ICR7cmVsYXRpdmVQYXRofWApOwogIGNvbnN0IHJlc29sdmVkID0gcGF0aC5yZXNvbHZlKHJvb3QsIHJlbGF0aXZlUGF0aCk7CiAgY29uc3QgZnJvbVJvb3QgPSBwYXRoLnJlbGF0aXZlKHJvb3QsIHJlc29sdmVkKTsKICBpZiAoZnJvbVJvb3QgPT09ICcuLicgfHwgZnJvbVJvb3Quc3RhcnRzV2l0aChgLi4ke3BhdGguc2VwfWApKSB7CiAgICB0aHJvdyBuZXcgRXJyb3IoYFBhdGggbGVhdmVzIHJlcG9zaXRvcnk6ICR7cmVsYXRpdmVQYXRofWApOwogIH0KICByZXR1cm4gcmVzb2x2ZWQ7Cn0KCmZ1bmN0aW9uIGFwcGVuZENhcHBlZCAocHJldmlvdXMsIGNodW5rKSB7CiAgaWYgKEJ1ZmZlci5ieXRlTGVuZ3RoKHByZXZpb3VzKSA+PSBNQVhfTE9HX0JZVEVTKSByZXR1cm4gcHJldmlvdXM7CiAgY29uc3QgcmVtYWluaW5nID0gTUFYX0xPR19CWVRFUyAtIEJ1ZmZlci5ieXRlTGVuZ3RoKHByZXZpb3VzKTsKICByZXR1cm4gcHJldmlvdXMgKyBjaHVuay50b1N0cmluZygndXRmOCcpLnNsaWNlKDAsIHJlbWFpbmluZyk7Cn0KCi8qKiBSdW4gb25lIGRlY2xhcmVkIGNvbW1hbmQgd2l0aG91dCBpbnZva2luZyBhIHNoZWxsLiAqLwpleHBvcnQgZnVuY3Rpb24gcnVuQ29tbWFuZCAoYXJndiwgY3dkLCB0aW1lb3V0TXMpIHsKICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7CiAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7CiAgICBsZXQgb3V0cHV0ID0gJyc7CiAgICBsZXQgdGltZWRPdXQgPSBmYWxzZTsKICAgIGxldCBmYWlsdXJlID0gbnVsbDsKICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oYXJndlswXSwgYXJndi5zbGljZSgxKSwgewogICAgICBjd2QsCiAgICAgIHNoZWxsOiBmYWxzZSwKICAgICAgZW52OiB7IC4uLnByb2Nlc3MuZW52LCBDSTogJzEnIH0sCiAgICAgIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ3BpcGUnXQogICAgfSk7CiAgICBjaGlsZC5zdGRvdXQub24oJ2RhdGEnLCBjaHVuayA9PiB7IG91dHB1dCA9IGFwcGVuZENhcHBlZChvdXRwdXQsIGNodW5rKTsgfSk7CiAgICBjaGlsZC5zdGRlcnIub24oJ2RhdGEnLCBjaHVuayA9PiB7IG91dHB1dCA9IGFwcGVuZENhcHBlZChvdXRwdXQsIGNodW5rKTsgfSk7CiAgICBjaGlsZC5vbignZXJyb3InLCBlcnJvciA9PiB7IGZhaWx1cmUgPSBlcnJvci5tZXNzYWdlOyB9KTsKICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7CiAgICAgIHRpbWVkT3V0ID0gdHJ1ZTsKICAgICAgY2hpbGQua2lsbCgnU0lHVEVSTScpOwogICAgfSwgdGltZW91dE1zKTsKICAgIGNoaWxkLm9uKCdjbG9zZScsIGNvZGUgPT4gewogICAgICBjbGVhclRpbWVvdXQodGltZXIpOwogICAgICByZXNvbHZlKHsKICAgICAgICBleGl0Q29kZTogY29kZSwKICAgICAgICBlbGFwc2VkTXM6IERhdGUubm93KCkgLSBzdGFydCwKICAgICAgICB0aW1lZE91dCwKICAgICAgICBmYWlsdXJlLAogICAgICAgIG91dHB1dAogICAgICB9KTsKICAgIH0pOwogIH0pOwp9CgpmdW5jdGlvbiB2YWxpZGF0ZU1hbmlmZXN0IChtYW5pZmVzdCkgewogIGlmIChtYW5pZmVzdC52ZXJzaW9uICE9PSAxIHx8ICFBcnJheS5pc0FycmF5KG1hbmlmZXN0LnNjZW5hcmlvcykpIHsKICAgIHRocm93IG5ldyBFcnJvcignTWFuaWZlc3QgbXVzdCBoYXZlIHZlcnNpb24gMSBhbmQgYSBzY2VuYXJpb3MgbGlzdCcpOwogIH0KICBjb25zdCBpZHMgPSBuZXcgU2V0KCk7CiAgZm9yIChjb25zdCBzY2VuYXJpbyBvZiBtYW5pZmVzdC5zY2VuYXJpb3MpIHsKICAgIGlmICghL15bYS16MC05LV0rJC8udGVzdChzY2VuYXJpby5pZCkgfHwgaWRzLmhhcyhzY2VuYXJpby5pZCkpIHsKICAgICAgdGhyb3cgbmV3IEVycm9yKGBTY2VuYXJpbyBJRCBpcyBpbnZhbGlkIG9yIGR1cGxpY2F0ZWQ6ICR7c2NlbmFyaW8uaWR9YCk7CiAgICB9CiAgICBpZHMuYWRkKHNjZW5hcmlvLmlkKTsKICAgIGlmICh0eXBlb2Ygc2NlbmFyaW8udGl0bGUgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzY2VuYXJpby5oYW5kb2ZmSGVhZGluZyAhPT0gJ3N0cmluZycKICAgICAgfHwgdHlwZW9mIHNjZW5hcmlvLmxpdmVQcm9vZiAhPT0gJ3N0cmluZycgfHwgIUFycmF5LmlzQXJyYXkoc2NlbmFyaW8uY2hlY2tzKSkgewogICAgICB0aHJvdyBuZXcgRXJyb3IoYFNjZW5hcmlvIGlzIGluY29tcGxldGU6ICR7c2NlbmFyaW8uaWR9YCk7CiAgICB9CiAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHNjZW5hcmlvLmNoZWNrcykgewogICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2hlY2suYXJndikgfHwgIWNoZWNrLmFyZ3YubGVuZ3RoCiAgICAgICAgfHwgY2hlY2suYXJndi5zb21lKHZhbHVlID0+IHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgfHwgdmFsdWUubGVuZ3RoID09PSAwKQogICAgICAgIHx8IHR5cGVvZiBjaGVjay5jd2QgIT09ICdzdHJpbmcnIHx8ICFBcnJheS5pc0FycmF5KGNoZWNrLnJlcXVpcmVzKSkgewogICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2hlY2sgaXMgaW5jb21wbGV0ZTogJHtzY2VuYXJpby5pZH1gKTsKICAgICAgfQogICAgICBpZiAoY2hlY2sudGltZW91dE1zICE9PSB1bmRlZmluZWQKICAgICAgICAmJiAoIU51bWJlci5pc0ludGVnZXIoY2hlY2sudGltZW91dE1zKSB8fCBjaGVjay50aW1lb3V0TXMgPCAxIHx8IGNoZWNrLnRpbWVvdXRNcyA+IE1BWF9USU1FT1VUX01TKSkgewogICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2hlY2sgdGltZW91dCBpcyBpbnZhbGlkOiAke3NjZW5hcmlvLmlkfWApOwogICAgICB9CiAgICB9CiAgfQp9CgpmdW5jdGlvbiBlc2NhcGVDZWxsICh2YWx1ZSkgewogIHJldHVybiBTdHJpbmcodmFsdWUpLnJlcGxhY2VBbGwoJ3wnLCAnXFx8JykucmVwbGFjZUFsbCgnXG4nLCAnICcpOwp9CgovKiogUHJvZHVjZSBhIGNvbmNpc2UgcmVwb3J0IHRoYXQgbmV2ZXIgZXF1YXRlcyBhIHBhc3NpbmcgY29kZSBjaGVjayB3aXRoIGxpdmUgYWNjZXB0YW5jZS4gKi8KZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclJlcG9ydCAocmVzdWx0KSB7CiAgY29uc3QgbGluZXMgPSBbCiAgICBgIyBXb3JrbG9vcCBjaGVja3M6ICR7cmVzdWx0Lm5hbWV9YCwKICAgICcnLAogICAgYEdlbmVyYXRlZDogJHtyZXN1bHQuZ2VuZXJhdGVkQXR9YCwKICAgIGBDb2RlIHVuZGVyIHRlc3Q6IFxgJHtyZXN1bHQucmVwb31cYCAoJHtyZXN1bHQucmV2aXNpb259JHtyZXN1bHQuZGlydHkgPyAnLCB1bmNvbW1pdHRlZCBjaGFuZ2VzJyA6ICcnfSlgLAogICAgJycsCiAgICBgKipBdXRvbWF0ZWQ6KiogJHtyZXN1bHQuc3VtbWFyeS5wYXNzZWR9IHBhc3NlZCwgJHtyZXN1bHQuc3VtbWFyeS5mYWlsZWR9IGZhaWxlZCwgJHtyZXN1bHQuc3VtbWFyeS5ub3RSdW59IG5vdCBydW4uYCwKICAgIGAqKkxpdmUgcHJvZHVjdCBwcm9vZjoqKiBTZWUgZWFjaCBzY2VuYXJpbyBiZWxvdy4gVGhpcyByZXBvcnQgZG9lcyBub3QgbWFyayBwcm9kdWN0IHdvcmsgRG9uZS5gLAogICAgJycsCiAgICAnfCBTY2VuYXJpbyB8IEF1dG9tYXRlZCBjaGVjayB8IFJlY29yZGVkIHN0YXRlIHwgT3duZXIgfCcsCiAgICAnfCAtLS0gfCAtLS0gfCAtLS0gfCAtLS0gfCcKICBdOwogIGZvciAoY29uc3Qgc2NlbmFyaW8gb2YgcmVzdWx0LnNjZW5hcmlvcykgewogICAgbGluZXMucHVzaChgfCAke2VzY2FwZUNlbGwoc2NlbmFyaW8udGl0bGUpfSB8ICR7c2NlbmFyaW8uYXV0b21hdGVkfSB8ICR7ZXNjYXBlQ2VsbChzY2VuYXJpby50YXNrLnN0YXRlKX0gfCAke2VzY2FwZUNlbGwoc2NlbmFyaW8udGFzay5vd25lcil9IHxgKTsKICB9CiAgaWYgKHJlc3VsdC51bm1hcHBlZFRhc2tzLmxlbmd0aCkgewogICAgbGluZXMucHVzaCgnJywgJyMjIExpdmluZy1wbGFuIHRhc2tzIHdpdGhvdXQgYSBRQSBzY2VuYXJpbycsICcnLAogICAgICAnVGhlc2UgcmVtYWluIHZpc2libGUgdW50aWwgc29tZW9uZSBtYXBzIGEgY2hlY2sgb3IgZXhwbGljaXRseSBzY29wZXMgdGhlbSBvdXQuJywgJycpOwogICAgZm9yIChjb25zdCB0YXNrIG9mIHJlc3VsdC51bm1hcHBlZFRhc2tzKSBsaW5lcy5wdXNoKGAtICR7dGFza31gKTsKICB9CiAgbGluZXMucHVzaCgnJywgJyMjIEV2aWRlbmNlIGFuZCBuZXh0IHByb29mJywgJycpOwogIGZvciAoY29uc3Qgc2NlbmFyaW8gb2YgcmVzdWx0LnNjZW5hcmlvcykgewogICAgbGluZXMucHVzaChgIyMjICR7c2NlbmFyaW8udGl0bGV9YCwgJycsCiAgICAgIGAtICoqQXV0b21hdGVkIHJlc3VsdDoqKiAke3NjZW5hcmlvLmF1dG9tYXRlZH0ke3NjZW5hcmlvLnJlYXNvbiA/IGAg4oCUICR7c2NlbmFyaW8ucmVhc29ufWAgOiAnJ30uYCwKICAgICAgYC0gKipMaXZlIHByb29mIHJlcXVpcmVkOioqICR7c2NlbmFyaW8ubGl2ZVByb29mfWAsCiAgICAgIGAtICoqTGl2aW5nLXBsYW4gbmV4dCBwcm9vZjoqKiAke3NjZW5hcmlvLnRhc2submV4dFByb29mfWApOwogICAgZm9yIChjb25zdCBjaGVjayBvZiBzY2VuYXJpby5jaGVja3MpIHsKICAgICAgbGluZXMucHVzaChgLSAqKkNoZWNrOioqIFxgJHtjaGVjay5hcmd2LmpvaW4oJyAnKX1cYCDigJQgJHtjaGVjay5zdGF0dXN9JHtjaGVjay5lbGFwc2VkTXMgIT09IHVuZGVmaW5lZCA/IGAgKCR7KGNoZWNrLmVsYXBzZWRNcyAvIDEwMDApLnRvRml4ZWQoMSl9IHMpYCA6ICcnfSR7Y2hlY2subG9nID8gYDsgW2xvZ10oJHtjaGVjay5sb2d9KWAgOiAnJ30uYCk7CiAgICB9CiAgICBsaW5lcy5wdXNoKCcnKTsKICB9CiAgbGluZXMucHVzaCgnVGhlIHJlY29yZGVkIHRhc2sgc3RhdGUgY29tZXMgZnJvbSB0aGUgbGl2aW5nIGhhbmRvZmYuIEF1dG9tYXRlZCBjaGVja3MgcHJvdmUgb25seSB0aGUgbmFtZWQgY29kZSBiZWhhdmlvcjsgYSByZWFsLXJvb20gb2JzZXJ2YXRpb24gYW5kIGh1bWFuIGFjY2VwdGFuY2Ugc3RheSBzZXBhcmF0ZS4nLCAnJyk7CiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xuJyk7Cn0KCi8qKiBBbiBhbGwtdW5tYXBwZWQgbWFuaWZlc3QgaXMgYW4gaW5jb21wbGV0ZSBzZXR1cCwgbm90IGEgc3VjY2Vzc2Z1bCBRQSBydW4uICovCmV4cG9ydCBmdW5jdGlvbiBleGl0Q29kZUZvclN1bW1hcnkgKHN1bW1hcnkpIHsKICByZXR1cm4gc3VtbWFyeS5mYWlsZWQgPiAwID8gMSA6IHN1bW1hcnkucGFzc2VkID09PSAwID8gMyA6IDA7Cn0KCmZ1bmN0aW9uIGdpdFN0YXRlIChyb290KSB7CiAgdHJ5IHsKICAgIGNvbnN0IHJldmlzaW9uID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLXNob3J0JywgJ0hFQUQnXSwgewogICAgICBjd2Q6IHJvb3QsIGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ2lnbm9yZSddCiAgICB9KS50cmltKCk7CiAgICBjb25zdCBkaXJ0eSA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydzdGF0dXMnLCAnLS1wb3JjZWxhaW4nXSwgewogICAgICBjd2Q6IHJvb3QsIGVuY29kaW5nOiAndXRmOCcsIHN0ZGlvOiBbJ2lnbm9yZScsICdwaXBlJywgJ2lnbm9yZSddCiAgICB9KS50cmltKCkubGVuZ3RoID4gMDsKICAgIHJldHVybiB7IHJldmlzaW9uLCBkaXJ0eSB9OwogIH0gY2F0Y2ggewogICAgcmV0dXJuIHsgcmV2aXNpb246ICdyZXZpc2lvbiB1bmtub3duJywgZGlydHk6IGZhbHNlIH07CiAgfQp9CgovKiogRXhlY3V0ZSB0aGUgbWFuaWZlc3QgYWdhaW5zdCBhIGNoZWNrb3V0IGFuZCB3cml0ZSBwcml2YXRlIGxvY2FsIGV2aWRlbmNlLiAqLwpleHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuUWEgKHsgcmVwbywgbWFuaWZlc3RQYXRoLCBoYW5kb2ZmUGF0aCwgb3V0RGlyLCBleGVjdXRlID0gcnVuQ29tbWFuZCB9KSB7CiAgY29uc3Qgcm9vdCA9IHBhdGgucmVzb2x2ZShyZXBvKTsKICBjb25zdCBvdXRwdXQgPSBwYXRoLnJlc29sdmUob3V0RGlyKTsKICBjb25zdCBzb3VyY2VTdGF0ZSA9IGdpdFN0YXRlKHJvb3QpOwogIGNvbnN0IG1hbmlmZXN0ID0gSlNPTi5wYXJzZShhd2FpdCByZWFkRmlsZShtYW5pZmVzdFBhdGgsICd1dGY4JykpOwogIGNvbnN0IHRhc2tCbG9ja3MgPSByZWFkVGFza0Jsb2Nrcyhhd2FpdCByZWFkRmlsZShoYW5kb2ZmUGF0aCwgJ3V0ZjgnKSk7CiAgdmFsaWRhdGVNYW5pZmVzdChtYW5pZmVzdCk7CiAgYXdhaXQgbWtkaXIob3V0cHV0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTsKICBjb25zdCBzY2VuYXJpb3MgPSBbXTsKICBmb3IgKGNvbnN0IHNjZW5hcmlvIG9mIG1hbmlmZXN0LnNjZW5hcmlvcykgewogICAgY29uc3QgdGFzayA9IHRhc2tCbG9ja3MuZ2V0KHNjZW5hcmlvLmhhbmRvZmZIZWFkaW5nKTsKICAgIGlmICghdGFzaykgdGhyb3cgbmV3IEVycm9yKGBMaXZpbmctcGxhbiB0YXNrIGlzIG1pc3Npbmc6ICR7c2NlbmFyaW8uaGFuZG9mZkhlYWRpbmd9YCk7CiAgICBjb25zdCBjaGVja3MgPSBbXTsKICAgIGZvciAoY29uc3QgY2hlY2sgb2Ygc2NlbmFyaW8uY2hlY2tzKSB7CiAgICAgIGNvbnN0IGN3ZCA9IHJlc29sdmVJbnNpZGUocm9vdCwgY2hlY2suY3dkKTsKICAgICAgY29uc3QgbWlzc2luZyA9IGNoZWNrLnJlcXVpcmVzLmZpbHRlcihmaWxlID0+ICFleGlzdHNTeW5jKHJlc29sdmVJbnNpZGUocm9vdCwgZmlsZSkpKTsKICAgICAgaWYgKG1pc3NpbmcubGVuZ3RoKSB7CiAgICAgICAgY2hlY2tzLnB1c2goeyBhcmd2OiBjaGVjay5hcmd2LCBzdGF0dXM6ICdOT1QgUlVOJywgcmVhc29uOiBgTWlzc2luZyAke21pc3Npbmcuam9pbignLCAnKX1gIH0pOwogICAgICAgIGNvbnRpbnVlOwogICAgICB9CiAgICAgIGNvbnN0IG91dGNvbWUgPSBhd2FpdCBleGVjdXRlKGNoZWNrLmFyZ3YsIGN3ZCwgY2hlY2sudGltZW91dE1zID8/IDEyMF8wMDApOwogICAgICBjb25zdCBzdGF0dXMgPSBvdXRjb21lLmV4aXRDb2RlID09PSAwICYmICFvdXRjb21lLnRpbWVkT3V0ID8gJ1BBU1MnIDogJ0ZBSUwnOwogICAgICBjb25zdCBsb2cgPSBgbG9ncy8ke3NjZW5hcmlvLmlkfS0ke2NoZWNrcy5sZW5ndGggKyAxfS50eHRgOwogICAgICBhd2FpdCBta2RpcihwYXRoLmpvaW4ob3V0cHV0LCAnbG9ncycpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTsKICAgICAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihvdXRwdXQsIGxvZyksIG91dGNvbWUub3V0cHV0IHx8IG91dGNvbWUuZmFpbHVyZSB8fCAnJywgJ3V0ZjgnKTsKICAgICAgY2hlY2tzLnB1c2goewogICAgICAgIGFyZ3Y6IGNoZWNrLmFyZ3YsCiAgICAgICAgc3RhdHVzLAogICAgICAgIGVsYXBzZWRNczogb3V0Y29tZS5lbGFwc2VkTXMsCiAgICAgICAgZXhpdENvZGU6IG91dGNvbWUuZXhpdENvZGUsCiAgICAgICAgdGltZWRPdXQ6IG91dGNvbWUudGltZWRPdXQsCiAgICAgICAgcmVhc29uOiBvdXRjb21lLmZhaWx1cmUgPz8gKG91dGNvbWUudGltZWRPdXQgPyAnVGltZWQgb3V0JyA6IHVuZGVmaW5lZCksCiAgICAgICAgbG9nCiAgICAgIH0pOwogICAgfQogICAgY29uc3QgYXV0b21hdGVkID0gY2hlY2tzLnNvbWUoY2hlY2sgPT4gY2hlY2suc3RhdHVzID09PSAnRkFJTCcpID8gJ0ZBSUwnCiAgICAgIDogY2hlY2tzLmxlbmd0aCA9PT0gMCB8fCBjaGVja3Muc29tZShjaGVjayA9PiBjaGVjay5zdGF0dXMgPT09ICdOT1QgUlVOJykgPyAnTk9UIFJVTicgOiAnUEFTUyc7CiAgICBzY2VuYXJpb3MucHVzaCh7CiAgICAgIGlkOiBzY2VuYXJpby5pZCwKICAgICAgdGl0bGU6IHNjZW5hcmlvLnRpdGxlLAogICAgICBsaXZlUHJvb2Y6IHNjZW5hcmlvLmxpdmVQcm9vZiwKICAgICAgYXV0b21hdGVkLAogICAgICByZWFzb246IGF1dG9tYXRlZCA9PT0gJ05PVCBSVU4nICYmICFjaGVja3MubGVuZ3RoID8gJ05vIGF1dG9tYXRlZCBjaGVjayBpcyBkZWZpbmVkJyA6IHVuZGVmaW5lZCwKICAgICAgdGFzaywKICAgICAgY2hlY2tzCiAgICB9KTsKICB9CiAgY29uc3QgbWFwcGVkID0gbmV3IFNldChtYW5pZmVzdC5zY2VuYXJpb3MubWFwKHNjZW5hcmlvID0+IHNjZW5hcmlvLmhhbmRvZmZIZWFkaW5nKSk7CiAgY29uc3QgdW5tYXBwZWRUYXNrcyA9IFsuLi50YXNrQmxvY2tzLmVudHJpZXMoKV0KICAgIC5maWx0ZXIoKFtoZWFkaW5nLCB0YXNrXSkgPT4gdGFzay5zdGF0ZSAhPT0gJ05vdCByZWNvcmRlZCcgJiYgIW1hcHBlZC5oYXMoaGVhZGluZykpCiAgICAubWFwKChbaGVhZGluZ10pID0+IGhlYWRpbmcpOwogIGNvbnN0IHJlc3VsdCA9IHsKICAgIG5hbWU6IG1hbmlmZXN0Lm5hbWUgfHwgJ1Byb2plY3QgY2hlY2snLAogICAgZ2VuZXJhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSwKICAgIHJlcG86IHJvb3QsCiAgICAuLi5zb3VyY2VTdGF0ZSwKICAgIHVubWFwcGVkVGFza3MsCiAgICBzdW1tYXJ5OiB7CiAgICAgIHBhc3NlZDogc2NlbmFyaW9zLmZpbHRlcihzY2VuYXJpbyA9PiBzY2VuYXJpby5hdXRvbWF0ZWQgPT09ICdQQVNTJykubGVuZ3RoLAogICAgICBmYWlsZWQ6IHNjZW5hcmlvcy5maWx0ZXIoc2NlbmFyaW8gPT4gc2NlbmFyaW8uYXV0b21hdGVkID09PSAnRkFJTCcpLmxlbmd0aCwKICAgICAgbm90UnVuOiBzY2VuYXJpb3MuZmlsdGVyKHNjZW5hcmlvID0+IHNjZW5hcmlvLmF1dG9tYXRlZCA9PT0gJ05PVCBSVU4nKS5sZW5ndGgKICAgIH0sCiAgICBzY2VuYXJpb3MKICB9OwogIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4ob3V0cHV0LCAncmVwb3J0Lmpzb24nKSwgSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKSArICdcbicpOwogIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4ob3V0cHV0LCAncmVwb3J0Lm1kJyksIHJlbmRlclJlcG9ydChyZXN1bHQpKTsKICByZXR1cm4gcmVzdWx0Owp9CgpmdW5jdGlvbiBwYXJzZUFyZ3MgKGFyZ3MpIHsKICBjb25zdCBvcHRpb25zID0gewogICAgcmVwbzogcHJvY2Vzcy5jd2QoKSwKICAgIG1hbmlmZXN0UGF0aDogcGF0aC5qb2luKGhlcmUsICdzY2VuYXJpb3MuanNvbicpLAogICAgaGFuZG9mZlBhdGg6IHBhdGgucmVzb2x2ZShoZXJlLCAnLi4nLCAnVEVBTV9TVEFUVVNfSEFORE9GRi5tZCcpLAogICAgb3V0RGlyOiBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJ3ZpcnR1YWwtcWEtb3V0cHV0JykKICB9OwogIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBhcmdzLmxlbmd0aDsgaW5kZXggKz0gMikgewogICAgY29uc3Qga2V5ID0gYXJnc1tpbmRleF07CiAgICBjb25zdCB2YWx1ZSA9IGFyZ3NbaW5kZXggKyAxXTsKICAgIGlmICghdmFsdWUgfHwgIVsnLS1yZXBvJywgJy0tbWFuaWZlc3QnLCAnLS1oYW5kb2ZmJywgJy0tb3V0J10uaW5jbHVkZXMoa2V5KSkgewogICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VzYWdlOiBub2RlIHJ1bm5lci5tanMgWy0tcmVwbyBQQVRIXSBbLS1tYW5pZmVzdCBQQVRIXSBbLS1oYW5kb2ZmIFBBVEhdIFstLW91dCBQQVRIXScpOwogICAgfQogICAgb3B0aW9uc1t7ICctLXJlcG8nOiAncmVwbycsICctLW1hbmlmZXN0JzogJ21hbmlmZXN0UGF0aCcsICctLWhhbmRvZmYnOiAnaGFuZG9mZlBhdGgnLCAnLS1vdXQnOiAnb3V0RGlyJyB9W2tleV1dID0gdmFsdWU7CiAgfQogIHJldHVybiBvcHRpb25zOwp9CgppZiAocHJvY2Vzcy5hcmd2WzFdICYmIHJlYWxwYXRoU3luYyhwcm9jZXNzLmFyZ3ZbMV0pID09PSByZWFscGF0aFN5bmMoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSkgewogIHRyeSB7CiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBydW5RYShwYXJzZUFyZ3MocHJvY2Vzcy5hcmd2LnNsaWNlKDIpKSk7CiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShgV29ya2xvb3AgY2hlY2tzOiAke3Jlc3VsdC5zdW1tYXJ5LnBhc3NlZH0gcGFzc2VkLCAke3Jlc3VsdC5zdW1tYXJ5LmZhaWxlZH0gZmFpbGVkLCAke3Jlc3VsdC5zdW1tYXJ5Lm5vdFJ1bn0gbm90IHJ1blxuYCk7CiAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGVGb3JTdW1tYXJ5KHJlc3VsdC5zdW1tYXJ5KTsKICB9IGNhdGNoIChlcnJvcikgewogICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFdvcmtsb29wIGNoZWNrcyBjb3VsZCBub3QgcnVuOiAke2Vycm9yLm1lc3NhZ2V9XG5gKTsKICAgIHByb2Nlc3MuZXhpdENvZGUgPSAyOwogIH0KfQo="


def repository_root() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], text=True, capture_output=True
    )
    if result.returncode:
        raise ValueError("Run this inside a Git repository")
    return Path(result.stdout.strip())


def read_pm_config(root: Path) -> dict:
    if not (root / PLAN).is_file() or not (root / PM_CONFIG).is_file():
        raise ValueError("Set up Workloop and its plan before Workloop checks")
    config = json.loads((root / PM_CONFIG).read_text())
    branch = config.get("branch")
    if not isinstance(branch, str) or not branch or "\n" in branch:
        raise ValueError("Workloop needs a valid watched branch")
    result = subprocess.run(
        ["git", "check-ref-format", "--branch", branch], capture_output=True
    )
    if result.returncode:
        raise ValueError("Workloop branch is invalid")
    return config


def workflow_template(branch: str, *, legacy: bool = False) -> str:
    quoted = json.dumps(branch)
    title = "Virtual QA checks" if legacy else "Workloop checks"
    return f"""name: {title}

on:
  push:
    branches:
      - {quoted}
  workflow_dispatch:

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: '22'
      - name: Run project scenario checks
        run: node .github/scripts/virtual_qa_runner.mjs --repo . --manifest VIRTUAL_QA_SCENARIOS.json --handoff VIRTUAL_PM.md --out virtual-qa-output
      - name: Keep the evidence report
        if: always()
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: virtual-qa-${{{{ github.run_id }}}}
          path: virtual-qa-output/
          if-no-files-found: warn
          retention-days: 14
"""


def runner_source() -> str:
    if RUNNER_PAYLOAD.startswith("@@"):
        return (Path(__file__).parent / "virtual_qa_runner.mjs").read_text()
    return base64.b64decode(RUNNER_PAYLOAD).decode("utf-8")


def manifest_source() -> str:
    if RUNNER_PAYLOAD.startswith("@@"):
        return (Path(__file__).parent / "qa-scenarios-starter.json").read_text()
    return json.dumps({
        "version": 1,
        "name": "My project",
        "scenarios": [{
            "id": "first-proof",
            "title": "First proof",
            "handoffHeading": "First proof",
            "liveProof": "Name the real user observation still needed before this work is Done.",
            "checks": [],
        }],
    }, indent=2) + "\n"


def verify(root: Path, *, announce: bool = True) -> dict[Path, str]:
    config = read_pm_config(root)
    for path in (MANIFEST, RUNNER, WORKFLOW):
        if not (root / path).is_file():
            raise ValueError(f"Workloop checks file is missing: {path}")
    manifest = json.loads((root / MANIFEST).read_text())
    if manifest.get("version") != 1 or not isinstance(manifest.get("scenarios"), list):
        raise ValueError("Workloop checks scenario manifest is invalid")
    expected = {
        WORKFLOW: workflow_template(config["branch"]),
        RUNNER: runner_source(),
    }
    legacy_workflow = workflow_template(config["branch"], legacy=True).encode("utf-8")
    versions = {}
    for path, source in expected.items():
        actual = (root / path).read_bytes()
        if actual == source.encode("utf-8"):
            versions[path] = "current"
        elif path == WORKFLOW and actual == legacy_workflow:
            versions[path] = "legacy"
        elif path == RUNNER and hashlib.sha256(actual).hexdigest() == LEGACY_RUNNER_SHA256:
            versions[path] = "legacy"
        else:
            # Teams can add dependency setup to this workflow and tailor a
            # runner. Legacy QA verification checked branch and syntax, so
            # keep those existing installs usable while withholding migration.
            versions[path] = "custom"
    if config["branch"] not in (root / WORKFLOW).read_text():
        raise ValueError("Workloop checks workflow is watching a different branch")
    check = subprocess.run(
        ["node", "--check", str(root / RUNNER)], text=True, capture_output=True
    )
    if check.returncode:
        raise ValueError(f"Workloop checks runner has a syntax error: {check.stderr.strip()}")
    if announce:
        print("Workloop checks files verified. Map real scenarios and prove a push-triggered run.")
        if "legacy" in versions.values():
            print("Legacy generated labels remain. Run install_qa.py migrate-labels to update managed files.")
        if "custom" in versions.values():
            print("Custom QA workflow or runner detected; inspect those files before changing generated labels.")
    return versions


def install(root: Path, dry_run: bool) -> None:
    config = read_pm_config(root)
    files = {
        MANIFEST: manifest_source(),
        RUNNER: runner_source(),
        WORKFLOW: workflow_template(config["branch"]),
    }
    if all((root / path).is_file() for path in files):
        versions = verify(root)
        custom = [path for path, version in versions.items() if version == "custom"]
        if custom:
            raise ValueError("Existing managed QA file differs; no files changed: " +
                             ", ".join(map(str, custom)))
        return
    conflicts = [path for path, content in files.items()
                 if (root / path).exists() and (root / path).read_text() != content]
    if conflicts:
        raise ValueError("Existing project file differs; integrate deliberately: " +
                         ", ".join(map(str, conflicts)))
    for path, content in files.items():
        if not (root / path).exists():
            print(("Would add" if dry_run else "Adding") + f" {path}")
            if not dry_run:
                (root / path).parent.mkdir(parents=True, exist_ok=True)
                (root / path).write_text(content)
    if not dry_run:
        verify(root)


def migrate_labels(root: Path, dry_run: bool) -> None:
    versions = verify(root, announce=False)
    custom = [path for path, version in versions.items() if version == "custom"]
    if custom:
        raise ValueError("Customized QA files need manual label review; no files changed: " +
                         ", ".join(map(str, custom)))
    config = read_pm_config(root)
    current = {
        WORKFLOW: workflow_template(config["branch"]),
        RUNNER: runner_source(),
    }
    pending = [path for path, version in versions.items() if version == "legacy"]
    if not pending:
        print("Workloop checks labels are already current; no files changed.")
        return
    for path in pending:
        print(("Would update" if dry_run else "Updating") + f" {path}")
        if not dry_run:
            (root / path).write_bytes(current[path].encode("utf-8"))
    if dry_run:
        print("Dry run only; no files changed.")
    else:
        verify(root)
        print("Managed labels updated. Review and commit these files deliberately.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("init", "verify", "migrate-labels"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        root = repository_root()
        if args.action == "init":
            install(root, args.dry_run)
        elif args.action == "migrate-labels":
            migrate_labels(root, args.dry_run)
        else:
            verify(root)
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Workloop checks setup stopped: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
