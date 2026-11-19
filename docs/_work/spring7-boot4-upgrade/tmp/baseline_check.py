from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent / 'checkout'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root).decode('utf-8').strip()

changed = git('diff', '--name-only').splitlines()
snapshot = {path: (root / path).read_bytes() for path in changed}
tests = git('ls-files', 'tests/*.node.test.mjs').splitlines()
command = ['node', '--experimental-transform-types', '--test', '--test-isolation=none']
logs = {}
try:
    subprocess.run(['git', 'restore', '--worktree', '--', *changed], cwd=root, check=True)
    logs['baseline'] = subprocess.run(command + tests, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT).stdout.decode('utf-8')
finally:
    for path, content in snapshot.items():
        (root / path).write_bytes(content)
logs['feature'] = subprocess.run(command + tests + ['tests/spring7-boot4-upgrade.node.test.mjs'], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT).stdout.decode('utf-8')
for name, log in logs.items():
    (root.parent / (name + '.log')).write_text(log, encoding='utf-8')
    print(name)
    print('\n'.join(line for line in log.splitlines() if line.startswith(('✖ ', 'ℹ tests', 'ℹ pass', 'ℹ fail'))))
def failures(log):
    return {line.split(' (')[0] for line in log.splitlines() if line.startswith('✖ ') and line != '✖ failing tests:'}
assert failures(logs['baseline']) == failures(logs['feature']), 'Feature introduced a new failure'
print('No new failures against committed HEAD baseline')
