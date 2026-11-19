<?php
declare(strict_types=1);

ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const SLOTS = ['10-12', '14-17', '18-20', '20-2230'];
const LIMITS = ['name' => 80, 'phone' => 40, 'email' => 120, 'title' => 80,
    'date' => 10, 'slot' => 7, 'intro' => 400, 'note' => 400];

function reply(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_THROW_ON_ERROR);
}

function validDate(string $date): bool
{
    return preg_match('/\A([0-9]{4})-([0-9]{2})-([0-9]{2})\z/', $date, $parts)
        && checkdate((int)$parts[2], (int)$parts[3], (int)$parts[1]);
}

function validateRequest(array $body, array &$errors): array
{
    $fields = [];
    foreach (LIMITS as $key => $limit) {
        $value = $body[$key] ?? '';
        $value = is_string($value) ? preg_replace('/\A[\s\p{Z}]+|[\s\p{Z}]+\z/u', '', trim($value)) : null;
        if ($value === null || ($key !== 'note' && $value === '')
            || !preg_match('/\A.{0,' . $limit . '}\z/us', $value)
            || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value)) {
            $errors[] = $key;
            continue;
        }
        $fields[$key] = $value;
    }
    $today = new DateTimeImmutable('today', new DateTimeZone('Asia/Kuala_Lumpur'));
    foreach ([
        'phone' => static function (string $value): bool {
            $digits = preg_replace('/\D/', '', $value);
            return preg_match('/\A\+?[0-9 ()-]+\z/', $value) && strlen($digits) >= 7 && strlen($digits) <= 15;
        },
        'email' => static function (string $value): bool { return filter_var($value, FILTER_VALIDATE_EMAIL) !== false; },
        'date' => static function (string $value) use ($today): bool {
            return validDate($value) && $value >= $today->format('Y-m-d');
        },
        'slot' => static function (string $value): bool { return in_array($value, SLOTS, true); },
    ] as $key => $check) {
        if (isset($fields[$key]) && !$check($fields[$key])) {
            $errors[] = $key;
        }
    }
    return $fields;
}

function moderation(array $request): string
{
    $text = implode("\n", [$request['title'], $request['intro'], $request['note']]);
    if (preg_match('/\b(?:sell illegal drugs|stalk and harass|organize a hate rally|drinking contest)\b|贩卖毒品|販賣毒品|组织骚扰|組織騷擾|jualan dadah haram/iu', $text)) {
        return 'rejected';
    }
    // Immediate approval is limited to recognizable low-risk titles and descriptions.
    $topic = '(?:AI meetup|language exchange|book club|coffee tasting|drawing workshop|board games|'
        . 'AI 交流局|AI交流|语言交换|讀書會|读书会|咖啡品鉴|绘画工作坊|桌游|'
        . 'Pertemuan AI|Pertukaran bahasa|Kelab buku|Sesi merasa kopi|Bengkel melukis|Permainan papan)';
    $intro = '(?:Share AI tools and tips|Practice languages together|Discuss books together|'
        . 'Taste coffee together|Draw together|Play board games together|分享AI工具和技巧|一起练习语言|一起读书|'
        . '一起品尝咖啡|一起画画|一起玩桌游|Kongsi alat dan petua AI|Berlatih bahasa bersama|'
        . 'Bincang buku bersama|Rasa kopi bersama|Melukis bersama|Bermain permainan papan bersama)';
    $notes = ['', 'projector', 'projector needed', '需要投影仪', 'Perlu projektor'];
    if (preg_match('/\A' . $topic . '\z/iu', $request['title'])
        && preg_match('/\A' . $intro . '[.!。！]?\z/iu', $request['intro'])
        && in_array(strtolower($request['note']), $notes, true)) {
        return 'confirmed';
    }
    return 'pending';
}

function authorizeStaff(): bool
{
    $token = getenv('COHUB_EVENTS_API_TOKEN');
    if ($token === false || $token === '') {
        $path = '/etc/cohub-events/api-token';
        $token = is_readable($path) ? trim((string)file_get_contents($path)) : '';
    }
    return strlen($token) >= 32
        && hash_equals('Bearer ' . $token, $_SERVER['HTTP_AUTHORIZATION'] ?? '');
}

function occupy(array $record): bool
{
    return $record['status'] === 'confirmed'
        || ($record['status'] === 'pending' && isset($record['owner']));
}

function privateDirectory(): string
{
    $directory = getenv('COHUB_EVENTS_DATA_DIR') ?: '/var/lib/cohub-events';
    $directory = realpath($directory);
    $root = realpath(__DIR__);
    if ($directory === false || $directory === $root || strpos($directory, $root . '/') === 0
        || !is_writable($directory) || (fileperms($directory) & 0077) !== 0) {
        throw new RuntimeException('Private event storage unavailable');
    }
    umask(0077);
    return $directory;
}

function transaction(bool $write, callable $operation, string $store = 'events'): array
{
    $directory = privateDirectory();
    $lock = fopen($directory . '/' . $store . '.lock', 'c');
    if ($lock === false) {
        throw new RuntimeException('Cannot open event lock');
    }
    try {
        if (!flock($lock, $write ? LOCK_EX : LOCK_SH)) {
            throw new RuntimeException('Cannot acquire event lock');
        }
        $path = $directory . '/' . $store . '.json';
        $records = [];
        if (file_exists($path)) {
            $contents = file_get_contents($path);
            if ($contents === false) {
                throw new RuntimeException('Cannot read event store');
            }
            $records = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($records)) {
                throw new RuntimeException('Invalid event store');
            }
        }
        [$status, $response, $changed] = $operation($records);
        if ($changed) {
            $temporary = tempnam($directory, $store . '-');
            if ($temporary === false) {
                throw new RuntimeException('Cannot stage event store');
            }
            try {
                $contents = json_encode($records, JSON_THROW_ON_ERROR);
                if (file_put_contents($temporary, $contents) !== strlen($contents) || !rename($temporary, $path)) {
                    throw new RuntimeException('Cannot commit event store');
                }
            } finally {
                if (file_exists($temporary)) {
                    unlink($temporary);
                }
            }
        }
        return [$status, $response];
    } finally {
        fclose($lock);
    }
}

function taken(array $records, array $request, string $except = ''): bool
{
    foreach ($records as $record) {
        if ($record['id'] !== $except && occupy($record) && $record['date'] === $request['date'] && $record['slot'] === $request['slot']) {
            return true;
        }
    }
    return false;
}

function summary(array $record): array
{
    return array_intersect_key($record, array_flip(['id', 'status', 'date', 'slot']));
}

function guestBooking(array $body, bool $cancel): array
{
    $id = $body['id'] ?? '';
    $token = $body['token'] ?? '';
    if (!is_string($id) || !preg_match('/\ACOHUB-[a-f0-9]{32}\z/', $id)
        || !is_string($token) || !preg_match('/\A[a-f0-9]{64}\z/', $token)) {
        return [403, ['status' => 'forbidden']];
    }
    return transaction($cancel, static function (array &$records) use ($id, $token, $cancel): array {
        if (!isset($records[$id]['cancelToken']) || !hash_equals($records[$id]['cancelToken'], $token)) {
            return [403, ['status' => 'forbidden'], false];
        }
        $record = &$records[$id];
        $changed = $cancel && $record['status'] === 'confirmed';
        if ($changed) {
            $record['status'] = 'cancelled';
        }
        $response = summary($record);
        if ($record['status'] === 'cancelled') {
            $response['slotAvailable'] = !taken($records, $record);
        }
        return [200, $response, $changed];
    });
}

function accountAction(string $action, array $body): array
{
    if (!in_array($action, ['register', 'sign-in'], true) && !isset($_COOKIE['COHUB_EVENTS'])) {
        return $action === 'sign-out' ? [200, ['status' => 'signed_out']] : [401, ['status' => 'sign_in']];
    }
    session_save_path(privateDirectory());
    session_name('COHUB_EVENTS');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cache_limiter', '');
    ini_set('session.gc_maxlifetime', '86400');
    ini_set('session.gc_probability', '1');
    session_set_cookie_params([
        'path' => '/', 'httponly' => true, 'samesite' => 'Strict',
        'secure' => ($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off',
    ]);
    if (!session_start()) {
        throw new RuntimeException('Cannot start guest session');
    }
    if ($action === 'sign-out') {
        $_SESSION = [];
        session_destroy();
        setcookie(session_name(), '', ['expires' => 1, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict']);
        return [200, ['status' => 'signed_out']];
    }

    if ($action === 'register' || $action === 'sign-in') {
        $email = $body['email'] ?? '';
        $phone = $body['phone'] ?? '';
        $password = $body['password'] ?? '';
        if (!is_string($email) || strlen($email) > 120 || !filter_var(trim($email), FILTER_VALIDATE_EMAIL)
            || !is_string($phone) || strlen($phone) > 40 || !preg_match('/\A\+?[0-9 ()-]+\z/', trim($phone))
            || !is_string($password) || strlen($password) < 12 || strlen($password) > 72
            || strpos($password, "\0") !== false) {
            return [422, ['status' => 'credentials']];
        }
        $email = strtolower(trim($email));
        $phone = preg_replace('/\D/', '', $phone);
        if (strlen($phone) < 7 || strlen($phone) > 15) {
            return [422, ['status' => 'credentials']];
        }
        $identity = hash('sha256', $email . ':' . $phone);
        $register = $action === 'register';
        [$code, $account] = transaction($register, static function (array &$accounts) use ($identity, $register, $password, $email, $phone): array {
            $account = $accounts[$identity] ?? null;
            if ($register) {
                if ($account !== null) {
                    return [409, ['status' => 'credentials'], false];
                }
                $account = ['id' => bin2hex(random_bytes(16)), 'email' => $email, 'phone' => $phone,
                    'passwordHash' => password_hash($password, PASSWORD_DEFAULT)];
                $accounts[$identity] = $account;
            } else {
                // Run password verification even for an unknown contact pair.
                $hash = $account['passwordHash'] ?? '$2y$10$LX4uuXQVcMsz5SNRSyXT6O/jTWMjj3BMlW5Y9J.kZOEh7kM/rDgou';
                if (!password_verify($password, $hash) || $account === null) {
                    return [403, ['status' => 'credentials'], false];
                }
            }
            return [200, $account, $register];
        }, 'accounts');
        if ($code !== 200) {
            return [$code, $account];
        }
        if (!session_regenerate_id(true)) {
            throw new RuntimeException('Cannot rotate session');
        }
        $_SESSION = ['guest' => array_intersect_key($account, array_flip(['id', 'email', 'phone'])),
            'expires' => time() + 86400];
    }

    $guest = ($_SESSION['expires'] ?? 0) > time() ? ($_SESSION['guest'] ?? null) : null;
    if (!session_write_close()) {
        throw new RuntimeException('Cannot save guest session');
    }
    if ($guest === null) {
        return [401, ['status' => 'sign_in']];
    }

    if (in_array($action, ['register', 'sign-in', 'my-events'], true)) {
        return transaction(false, static function (array $records) use ($guest): array {
            $mine = [];
            foreach (array_reverse($records) as $record) {
                if (($record['owner'] ?? null) === $guest['id']) {
                    $mine[] = summary($record) + array_intersect_key($record, array_flip(['title', 'reason']));
                }
            }
            return [200, ['email' => $guest['email'], 'phone' => $guest['phone'], 'requests' => $mine], false];
        });
    }
    if ($action === 'cancel-my-event') {
        $id = $body['id'] ?? '';
        return transaction(true, static function (array &$records) use ($id, $guest): array {
            if (!is_string($id) || ($records[$id]['owner'] ?? null) !== $guest['id']) {
                return [404, ['status' => 'unknown'], false];
            }
            $record = &$records[$id];
            $changed = occupy($record);
            if ($changed) {
                $record['status'] = 'cancelled';
            }
            return [200, summary($record), $changed];
        });
    }

    $errors = [];
    $request = validateRequest(array_replace($body, ['email' => $guest['email'], 'phone' => $guest['phone']]), $errors);
    if ($errors) {
        return [422, ['status' => 'invalid', 'fields' => $errors]];
    }
    $rejected = moderation($request) === 'rejected';
    return transaction(true, static function (array &$records) use ($request, $guest, $rejected): array {
        if (!$rejected && taken($records, $request)) {
            return [409, ['status' => 'taken'], false];
        }
        $id = 'COHUB-' . bin2hex(random_bytes(16));
        $record = ['id' => $id, 'owner' => $guest['id'], 'status' => $rejected ? 'rejected' : 'pending'] + $request;
        if ($rejected) {
            $record['reason'] = 'venue_policy';
        }
        $records[$id] = $record;
        return [202, summary($record), true];
    });
}

function posterPath($file): ?string
{
    if (!is_string($file) || !preg_match('/\Acohub-poster-[a-z0-9-]+\.(?:webp|png|jpg)\z/', $file)) {
        return null;
    }
    $path = 'assets/coffee/' . $file;
    return is_file(__DIR__ . '/' . $path) ? $path : null;
}

function isUpcoming(array $record): bool
{
    $timezone = new DateTimeZone('Asia/Kuala_Lumpur');
    $today = new DateTimeImmutable('today', $timezone);
    return $record['date'] >= $today->format('Y-m-d');
}

function signUpForEvent(array $body): array
{
    $id = $body['id'] ?? '';
    $name = $body['name'] ?? '';
    $email = $body['email'] ?? '';
    if (!is_string($id) || !is_string($name) || !preg_match('/\A[^\p{C}]{1,80}\z/u', trim($name))
        || !is_string($email) || strlen($email) > 120 || !filter_var(trim($email), FILTER_VALIDATE_EMAIL)) {
        return [422, ['status' => 'invalid']];
    }
    $email = strtolower(trim($email));
    return transaction(true, static function (array &$records) use ($id, $name, $email): array {
        $record = $records[$id] ?? null;
        if ($record === null || $record['status'] !== 'confirmed' || !isUpcoming($record)
            || posterPath($record['poster'] ?? null) === null) {
            return [404, ['status' => 'unknown'], false];
        }
        $registrations = $record['registrations'] ?? [];
        if (isset($registrations[$email])) {
            return [200, ['status' => 'joined'], false];
        }
        if (count($registrations) >= 20) {
            return [409, ['status' => 'full'], false];
        }
        $records[$id]['registrations'][$email] = ['name' => trim($name), 'email' => $email];
        return [201, ['status' => 'joined'], true];
    });
}

function publishedEvents(): array
{
    return transaction(false, static function (array $records): array {
        $events = [];
        foreach ($records as $record) {
            if ($record['status'] !== 'confirmed' || !isUpcoming($record)) {
                continue;
            }
            $poster = posterPath($record['poster'] ?? null);
            if ($poster !== null) {
                $events[] = summary($record) + ['title' => $record['title'], 'intro' => $record['intro'], 'poster' => $poster];
            }
        }
        usort($events, static function (array $a, array $b): int {
            return [$a['date'], $a['slot']] <=> [$b['date'], $b['slot']];
        });
        return [200, ['events' => $events], false];
    });
}

function handle(): array
{
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($method === 'GET') {
        if (($_GET['published'] ?? '') === '1') {
            return publishedEvents();
        }
        $date = $_GET['date'] ?? '';
        if (!is_string($date) || !validDate($date)) {
            return [422, ['status' => 'invalid', 'fields' => ['date']]];
        }
        return transaction(false, static function (array $records) use ($date): array {
            $occupied = [];
            foreach ($records as $record) {
                if (occupy($record) && $record['date'] === $date) {
                    $occupied[] = $record['slot'];
                }
            }
            return [200, ['date' => $date, 'occupied' => $occupied, 'events' => []], false];
        });
    }
    if ($method !== 'POST') {
        header('Allow: GET, POST');
        return [405, ['status' => 'method']];
    }
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        return [415, ['status' => 'invalid']];
    }
    $raw = file_get_contents('php://input', false, null, 0, 8193);
    if ($raw === false || strlen($raw) > 8192) {
        return [413, ['status' => 'invalid']];
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        return [400, ['status' => 'invalid']];
    }
    $action = $body['action'] ?? 'request';
    if ($action === 'guest-status' || $action === 'guest-cancel') {
        return guestBooking($body, $action === 'guest-cancel');
    }
    if (in_array($action, ['register', 'sign-in', 'sign-out', 'my-events', 'submit-event', 'cancel-my-event'], true)) {
        return accountAction($action, $body);
    }
    if ($action === 'join-event') {
        return signUpForEvent($body);
    }
    if ($action === 'request') {
        return [401, ['status' => 'sign_in']];
    }
    if (!in_array($action, ['lock', 'pending', 'approve', 'reject', 'cancel', 'publish', 'attendees'], true)) {
        return [400, ['status' => 'invalid']];
    }
    if (!authorizeStaff()) {
        return [403, ['status' => 'forbidden']];
    }
    if ($action === 'pending') {
        return transaction(false, static function (array $records): array {
            $pending = array_filter($records, static function (array $record): bool {
                return $record['status'] === 'pending';
            });
            return [200, ['requests' => array_values(array_map(static function (array $record): array {
                unset($record['cancelToken'], $record['owner'], $record['retryHash']);
                return $record;
            }, $pending))], false];
        });
    }
    if ($action === 'attendees') {
        $id = $body['id'] ?? '';
        return transaction(false, static function (array $records) use ($id): array {
            if (!is_string($id) || !isset($records[$id])) {
                return [404, ['status' => 'unknown'], false];
            }
            return [200, ['attendees' => array_values($records[$id]['registrations'] ?? [])], false];
        });
    }
    if ($action === 'publish') {
        $id = $body['id'] ?? '';
        $poster = $body['poster'] ?? null;
        if (posterPath($poster) === null) {
            return [422, ['status' => 'invalid', 'fields' => ['poster']]];
        }
        return transaction(true, static function (array &$records) use ($id, $poster): array {
            if (!is_string($id) || !isset($records[$id])) {
                return [404, ['status' => 'unknown'], false];
            }
            $record = &$records[$id];
            if ($record['status'] !== 'confirmed') {
                return [409, ['status' => $record['status']], false];
            }
            $record['poster'] = $poster;
            return [200, summary($record), true];
        });
    }
    if (in_array($action, ['approve', 'reject', 'cancel'], true)) {
        $id = $body['id'] ?? '';
        $reason = $body['reason'] ?? '';
        if ($action === 'reject' && (!is_string($reason) || !preg_match('/\A.{1,400}\z/u', trim($reason)))) {
            return [422, ['status' => 'invalid', 'fields' => ['reason']]];
        }
        return transaction(true, static function (array &$records) use ($id, $action, $reason): array {
            if (!is_string($id) || !isset($records[$id])) {
                return [404, ['status' => 'unknown'], false];
            }
            $record = &$records[$id];
            if ($action === 'cancel' && in_array($record['status'], ['pending', 'confirmed'], true)) {
                $record['status'] = 'cancelled';
                return [200, summary($record), true];
            }
            if ($action === 'reject' && $record['status'] === 'pending') {
                $record['status'] = 'rejected';
                $record['reason'] = trim($reason);
                return [200, summary($record) + ['reason' => $record['reason']], true];
            }
            if ($action !== 'approve' || $record['status'] !== 'pending') {
                return [409, ['status' => $record['status']], false];
            }
            $errors = [];
            validateRequest($record, $errors);
            if ($errors) {
                return [422, ['status' => 'invalid', 'fields' => $errors], false];
            }
            if (taken($records, $record, $id)) {
                return [409, ['status' => 'taken'], false];
            }
            $record['status'] = 'confirmed';
            return [200, summary($record), true];
        });
    }

    $errors = [];
    $request = validateRequest($body, $errors);
    if ($errors) {
        return [422, ['status' => 'invalid', 'fields' => $errors]];
    }
    $status = moderation($request);
    if ($status === 'rejected') {
        return [422, ['status' => 'rejected', 'reason' => 'venue_policy']];
    }
    $retryKey = $body['retryKey'] ?? null;
    if ($retryKey !== null && (!is_string($retryKey) || !preg_match('/\A[0-9a-f-]{36}\z/', $retryKey))) {
        return [422, ['status' => 'invalid']];
    }
    $retryHash = $retryKey === null ? null : hash('sha256', $retryKey);
    return transaction(true, static function (array &$records) use ($request, $status, $retryHash): array {
        if ($retryHash !== null) {
            foreach ($records as $record) {
                if (($record['retryHash'] ?? null) !== $retryHash) {
                    continue;
                }
                $same = array_intersect_key($record, LIMITS) === $request;
                if (!$same || !in_array($record['status'], ['confirmed', 'pending'], true)) {
                    return [409, ['status' => 'retry_conflict'], false];
                }
                // Older requests can receive a token on an authenticated retry.
                $newToken = !isset($record['cancelToken']);
                $record['cancelToken'] ??= bin2hex(random_bytes(32));
                $records[$record['id']] = $record;
                return [$record['status'] === 'confirmed' ? 201 : 202,
                    summary($record) + ['cancelToken' => $record['cancelToken']], $newToken];
            }
        }
        if (taken($records, $request)) {
            return [409, ['status' => 'taken'], false];
        }
        $id = 'COHUB-' . bin2hex(random_bytes(16));
        $record = ['id' => $id, 'status' => $status, 'retryHash' => $retryHash,
            'cancelToken' => bin2hex(random_bytes(32))] + $request;
        $records[$id] = $record;
        return [$status === 'confirmed' ? 201 : 202,
            summary($record) + ['cancelToken' => $record['cancelToken']], true];
    });
}

try {
    [$status, $body] = handle();
    reply($status, $body);
} catch (Throwable $error) {
    error_log('CO-HUB community event store request failed');
    reply(503, ['status' => 'unavailable']);
}
