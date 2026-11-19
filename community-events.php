<?php
declare(strict_types=1);

ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const POSTER_LIMIT = 2000000;
const POSTER_TYPES = ['webp' => 'image/webp', 'png' => 'image/png', 'jpg' => 'image/jpeg'];

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
    $rules = [
        'venue_policy_illegal' =>
            '\b(?:sell(?:ing)? (?:illegal drugs|contraband)|drug trafficking|money laundering|illegal fundraising|'
            . 'gambling tournament|cash betting|run an illegal casino|armed attack|attack people with weapons|'
            . '(?:exploit(?:ing)?|harm(?:ing)?|abus(?:e|ing)) (?:minors|children)|underage drinking|'
            . '(?:jualan|pengedaran) dadah haram|jualan barang larangan|pengubahan wang haram|kutipan dana haram|'
            . 'pertandingan judi|pertaruhan wang|serangan bersenjata|(?:mencederakan|mengeksploitasi|mendera) kanak-kanak)\b|'
            . '贩卖毒品|販賣毒品|毒品交易|销售违禁品|販售違禁品|非法集资|非法集資|洗钱|洗錢|'
            . '组织赌博|組織賭博|现金赌博|現金賭博|持械袭击|持械襲擊|武装袭击|武裝襲擊|'
            . '(?:伤害|傷害|虐待|利用|剥削|剝削)(?:未成年人|儿童|兒童)',
        'venue_policy_fraud' =>
            '\b(?:ponzi scheme|pyramid scheme|run (?:a |an )?(?:investment )?scam|defraud (?:investors|participants)|'
            . '(?:guaranteed?|promise[ds]?) (?:investment returns|profits|risk-free returns)|'
            . '(?:earn|paid) (?:money )?(?:by|for) recruiting (?:members|investors)|'
            . 'skim (?:ponzi|piramid)|menipu pelabur|jaminan (?:pulangan|keuntungan|modal) pelaburan|'
            . 'pulangan pelaburan dijamin|komisen (?:untuk|dengan) merekrut ahli)\b|'
            . '投资诈骗|投資詐騙|资金盘|資金盤|庞氏骗局|龐氏騙局|传销|傳銷|'
            . '保本保收益|保本保息|保本稳赚|保本穩賺|保证收益|保證收益|承诺保本|承諾保本|拉人头|拉人頭',
        'venue_policy_harassment' =>
            '\b(?:sexually harass (?:people|participants|attendees)|stalk and harass|stalk (?:participants|attendees)|'
            . 'doxx?(?:ing)? (?:participants|attendees)|(?:organize|coordinate|incite) (?:targeted )?harassment|'
            . 'targeted verbal abuse|gangguan seksual terhadap peserta|mengekori peserta|dedahkan maklumat peribadi peserta|'
            . 'menghasut orang untuk mengganggu|makian terhadap peserta)\b|'
            . '(?:对|對)参[与與]者(?:实施|實施)?性骚扰|性騷擾參加者|性骚扰参与者|跟踪参与者|跟蹤參與者|'
            . '起底(?:他人|参与者|參與者)|人肉搜索(?:他人|参与者|參與者)|组织骚扰|組織騷擾|'
            . '煽动骚扰|煽動騷擾|辱骂参与者|辱罵參與者',
        'venue_policy_harmful' =>
            '\b(?:porn(?:ography)? screening|screen(?:ing)? (?:porn(?:ography)?|sexually explicit content|graphic violence)|'
            . 'explicit sex show|extreme violence footage|(?:promote|encourage|glorify) (?:self[- ]harm|hurting others)|'
            . 'drinking contest|tayangan (?:pornografi|bahan lucah|keganasan melampau)|'
            . 'pertunjukan seks eksplisit|menggalakkan (?:mencederakan diri|mencederakan orang lain)|pertandingan minum arak)\b|'
            . '放映色情|色情表演|播放露骨性内容|播放露骨性內容|展示极端暴力|展示極端暴力|'
            . '宣扬自残|宣揚自殘|鼓励自残|鼓勵自殘|鼓励伤害他人|鼓勵傷害他人|拼酒比赛|拼酒比賽',
        'venue_policy_controversial' =>
            '\b(?:political party campaign|(?:election|campaign) rally|organi[sz](?:e|ing) (?:a |an )?protest|'
            . 'religious extremist rally|incite (?:religious|racial) hatred|attack (?:a specific religion|religious groups)|'
            . 'hate rally|racial supremacy rally|(?:promote|encourage) (?:racial|religious|gender|nationality[- ]based) discrimination|'
            . 'kempen parti politik|kempen pilihan raya|menganjurkan protes|perhimpunan pelampau agama|'
            . 'menghina penganut agama tertentu|menghasut kebencian (?:kaum|agama)|'
            . 'menggalakkan diskriminasi (?:kaum|agama|jantina|kewarganegaraan))\b|'
            . '政党竞选|政黨競選|组织抗议|組織抗議|宗教极端集会|宗教極端集會|攻击特定宗教|攻擊特定宗教|'
            . '种族仇恨集会|種族仇恨集會|煽动(?:种族|宗教|性别|国籍)(?:歧视|仇恨)|'
            . '煽動(?:種族|宗教|性別|國籍)(?:歧視|仇恨)',
    ];
    // Context can make an otherwise explicit phrase a discussion or prevention topic.
    $context = '/\b(?:prevent(?:ing|ion)?|awareness|case stud(?:y|ies)|discuss(?:ion|ing)?|'
        . 'avoid(?:ing)?|reporting|against|recognis(?:e|ing)|recogniz(?:e|ing)|no|not|without)\b|'
        . '防范|防範|预防|預防|识别|識別|反对|反對|禁止|讨论|討論|案例分析|'
        . '\b(?:mencegah|pencegahan|kesedaran|kajian kes|perbincangan|tanpa|bukan|jangan)\b/iu';
    $needsReview = false;
    foreach (preg_split('/[.!?;。！？；\n]+/u', $text) as $sentence) {
        foreach ($rules as $reason => $pattern) {
            if (preg_match('/' . $pattern . '/iu', $sentence)) {
                if (!preg_match($context, $sentence)) {
                    return $reason;
                }
                $needsReview = true;
            }
        }
    }
    if ($needsReview || preg_match('/\b(?:illegal drugs|contraband|gambling|investment scam|recruitment commission|'
        . 'guaranteed returns|guaranteed principal|capital protection|risk[- ]free investment|sexual harassment|stalking|doxx?ing|child abuse|weapon sales|pornography|graphic violence|'
        . 'self[- ]harm|religious extremism|hate speech|gangguan seksual|dadah haram|perjudian|'
        . 'barang larangan|pulangan terjamin|penipuan pelaburan|ucapan kebencian|mencederakan diri)\b|'
        . '毒品|违禁品|違禁品|赌博|賭博|诈骗|詐騙|性骚扰|性騷擾|传销|傳銷|暴力活动|暴力活動|跟踪骚扰|跟蹤騷擾|'
        . '色情|自残|自殘|极端暴力|極端暴力|宗教极端|宗教極端|歧视|歧視|保本|保收益|静态收益|靜態收益/iu', $text)) {
        return 'pending';
    }
    preg_match_all('/(?:(over|more than|lebih daripada|超过|超過)\s*)?([0-9]+)\s*'
        . '(?:(?:[-–~至到]|to)\s*([0-9]+))?\s*([+＋])?\s*'
        . '(?:people\b|persons?\b|participants?\b|guests?\b|attendees?\b|pax\b|orang\b|peserta\b|人|位)/iu', $text, $counts, PREG_SET_ORDER | PREG_UNMATCHED_AS_NULL);
    foreach ($counts as $count) {
        if ((int)$count[2] > 20 || (int)$count[3] > 20
            || ((int)$count[2] === 20 && ($count[1] !== null || $count[4] !== null))) {
            return 'pending';
        }
    }
    if (preg_match('/\b(?:exclusive use|private buyout|whole venue|(?:book|rent) (?:out )?the entire venue|'
        . 'stage setup|portable stage|(?:need|build|set up) (?:a )?stage|special (?:audio|sound)|large decorations|'
        . 'extensive decorations|structural changes|reconfigure the venue|venue schedule conflict|'
        . 'possible (?:schedule|scheduling) conflict|overlap with (?:another|a house|an in-house)|'
        . 'to be decided|to be confirmed|unspecified|not sure|undecided|details (?:pending|tbd)|tbc|tbd|'
        . 'sewa (?:seluruh ruang|seluruh premis)|penggunaan eksklusif|pentas khas|sistem bunyi khas|hiasan besar|belum pasti|pertindihan jadual)\b|'
        . '包场|包場|独占场地|獨佔場地|(?:搭建|需要|架設|架设)(?:一個|一个)?舞台|特殊音响|特殊音響|大量装饰|大量裝飾|改建场地|改建場地|'
        . '可能冲突|可能衝突|店内安排冲突|店內安排衝突|待定|还没想好|還沒想好/iu', $text)
        || preg_match('/\A(?:[^\p{L}\p{N}]*|tbd|test|n\/?a|unknown|未知|再说|再說)\z/iu', $request['intro'])) {
        return 'pending';
    }
    return 'confirmed';
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
    return in_array($record['status'], ['pending', 'confirmed'], true);
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
        $result = $operation($records);
        [$status, $response, $changed] = $result;
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
        if (isset($result[3])) {
            $result[3]();
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
    return array_intersect_key($record, array_flip(['id', 'status', 'title', 'date', 'slot']));
}

function changeStatus(array &$record, string $status): void
{
    $record['status'] = $status;
    if (in_array($status, ['confirmed', 'cancelled'], true)) {
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $record['updates'][] = ['status' => $status, 'changedAt' => $now->format('Y-m-d\TH:i:s.u\Z')];
    }
}

function eventUpdates(array $body): array
{
    $since = '';
    if (array_key_exists('since', $body)) {
        $value = $body['since'];
        if (!is_string($value)
            || !preg_match('/\A([0-9]{4}-[0-9]{2}-[0-9]{2})T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,6})?Z\z/', $value, $parts)
            || !validDate($parts[1])) {
            return [422, ['status' => 'invalid', 'fields' => ['since']]];
        }
        $since = (new DateTimeImmutable($value))->format('Y-m-d\TH:i:s.u\Z');
    }
    return transaction(false, static function (array $records) use ($since): array {
        $updates = [];
        foreach ($records as $record) {
            foreach ($record['updates'] ?? [] as $change) {
                if ($change['changedAt'] >= $since) {
                    $updates[] = $change + summary($record)
                        + array_intersect_key($record, array_flip(['name', 'phone', 'email']));
                }
            }
        }
        usort($updates, static function (array $a, array $b): int {
            return $a['changedAt'] <=> $b['changedAt'];
        });
        return [200, ['updates' => $updates], false];
    });
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
            changeStatus($record, 'cancelled');
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
            || !is_string($password) || strlen($password) < 6 || strlen($password) > 72
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
                    $mine[] = summary($record) + ['poster' => posterUrl($record['poster'] ?? null)]
                        + array_intersect_key($record, ['reason' => true]);
                }
            }
            return [200, ['email' => $guest['email'], 'phone' => $guest['phone'], 'requests' => $mine], false];
        });
    }
    if ($action === 'upload-poster') {
        return uploadPoster($body['id'] ?? '', $guest['id']);
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
                changeStatus($record, 'cancelled');
            }
            return [200, summary($record), $changed];
        });
    }

    $errors = [];
    $request = validateRequest(array_replace($body, ['email' => $guest['email'], 'phone' => $guest['phone']]), $errors);
    if ($errors) {
        return [422, ['status' => 'invalid', 'fields' => $errors]];
    }
    $decision = moderation($request);
    $status = str_starts_with($decision, 'venue_policy_') ? 'rejected' : $decision;
    return transaction(true, static function (array &$records) use ($request, $guest, $status, $decision): array {
        if (taken($records, $request)) {
            return [409, ['status' => 'taken'], false];
        }
        $id = 'COHUB-' . bin2hex(random_bytes(16));
        $record = ['id' => $id, 'owner' => $guest['id']] + $request;
        changeStatus($record, $status);
        if ($status === 'rejected') {
            $record['reason'] = $decision;
        }
        $records[$id] = $record;
        return [$status === 'confirmed' ? 201 : 202,
            summary($record) + array_intersect_key($record, ['reason' => true]), true];
    });
}

function posterDirectory(bool $create = false): string
{
    $directory = privateDirectory() . '/posters';
    if ($create && !is_dir($directory) && !mkdir($directory, 0700)) {
        throw new RuntimeException('Cannot create poster directory');
    }
    if (is_link($directory) || (file_exists($directory)
        && (!is_dir($directory) || (fileperms($directory) & 0077) !== 0))) {
        throw new RuntimeException('Private poster storage unavailable');
    }
    return $directory;
}

function posterPath($file): ?string
{
    if (!is_string($file) || !preg_match('/\Acohub-poster-[a-z0-9-]+\.(?:webp|png|jpg)\z/', $file)) {
        return null;
    }
    $private = posterDirectory() . '/' . $file;
    if (!is_link($private) && is_file($private)) {
        return $private;
    }
    $static = __DIR__ . '/assets/coffee/' . $file;
    return is_file($static) ? $static : null;
}

function posterUrl($file): ?string
{
    return posterPath($file) === null ? null : '/community-events.php?poster=' . $file;
}

function uploadPoster($id, string $owner): array
{
    return transaction(true, static function (array &$records) use ($id, $owner): array {
        if (!is_string($id) || !preg_match('/\ACOHUB-[a-f0-9]{32}\z/', $id)
            || ($records[$id]['owner'] ?? null) !== $owner) {
            return [404, ['status' => 'unknown'], false];
        }
        $record = &$records[$id];
        if ($record['status'] !== 'confirmed') {
            return [409, ['status' => 'not_confirmed'], false];
        }

        $upload = $_FILES['poster'] ?? [];
        $type = false;
        if (($upload['error'] ?? null) === UPLOAD_ERR_OK && $upload['size'] <= POSTER_LIMIT) {
            $image = @getimagesize($upload['tmp_name']);
            if ($image !== false && $image[0] > 0 && $image[1] > 0) {
                $type = array_search($image['mime'], POSTER_TYPES, true);
            }
        }
        if ($type === false) {
            return [422, ['status' => 'invalid', 'fields' => ['poster']], false];
        }

        $prefix = 'cohub-poster-' . substr($id, 6);
        $file = $prefix . '.' . $type;
        $directory = posterDirectory(true);
        $temporary = tempnam($directory, 'upload-');
        if ($temporary === false) {
            throw new RuntimeException('Cannot stage poster');
        }
        try {
            if (!move_uploaded_file($upload['tmp_name'], $temporary) || !chmod($temporary, 0600)
                || !rename($temporary, $directory . '/' . $file)) {
                throw new RuntimeException('Cannot save poster');
            }
        } finally {
            if (is_file($temporary)) {
                unlink($temporary);
            }
        }

        $previous = $record['poster'] ?? null;
        $record['poster'] = $file;
        // Keep the previous image available until the new association is committed.
        $cleanup = static function () use ($previous, $file, $prefix, $directory, &$records): void {
            if ($previous !== $file && in_array($previous, [
                $prefix . '.webp', $prefix . '.png', $prefix . '.jpg',
            ], true) && !in_array($previous, array_column($records, 'poster'), true)) {
                $path = $directory . '/' . $previous;
                if (is_file($path) && !unlink($path)) {
                    error_log('CO-HUB could not remove a superseded guest poster');
                }
            }
        };
        return [200, summary($record) + ['poster' => posterUrl($file)], $previous !== $file, $cleanup];
    });
}

function servePoster($file): void
{
    [$status, $body] = transaction(false, static function (array $records) use ($file): array {
        $path = posterPath($file);
        if ($path !== null) {
            foreach ($records as $record) {
                if (($record['poster'] ?? null) === $file && $record['status'] === 'confirmed' && isUpcoming($record)) {
                    header('Content-Type: ' . POSTER_TYPES[pathinfo($path, PATHINFO_EXTENSION)]);
                    readfile($path);
                    return [200, [], false];
                }
            }
        }
        return [404, ['status' => 'unknown'], false];
    });
    if ($status !== 200) {
        reply($status, $body);
    }
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
            $poster = posterUrl($record['poster'] ?? null);
            if ($poster !== null) {
                $events[] = summary($record) + ['intro' => $record['intro'], 'poster' => $poster];
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
                    $occupied[$record['slot']] = $record['slot'];
                }
            }
            return [200, ['date' => $date, 'occupied' => array_values($occupied), 'events' => []], false];
        });
    }
    if ($method !== 'POST') {
        header('Allow: GET, POST');
        return [405, ['status' => 'method']];
    }
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType === 'multipart/form-data' && ($_POST['action'] ?? '') === 'upload-poster') {
        return accountAction('upload-poster', $_POST);
    }
    if ($contentType !== 'application/json') {
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
    if (!in_array($action, ['lock', 'updates', 'pending', 'approve', 'reject', 'cancel', 'publish', 'attendees'], true)) {
        return [400, ['status' => 'invalid']];
    }
    if (!authorizeStaff()) {
        return [403, ['status' => 'forbidden']];
    }
    if ($action === 'updates') {
        return eventUpdates($body);
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
        return transaction(true, static function (array &$records) use ($id, $poster): array {
            if (posterPath($poster) === null) {
                return [422, ['status' => 'invalid', 'fields' => ['poster']], false];
            }
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
                changeStatus($record, 'cancelled');
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
            changeStatus($record, 'confirmed');
            return [200, summary($record), true];
        });
    }

    $errors = [];
    $request = validateRequest($body, $errors);
    if ($errors) {
        return [422, ['status' => 'invalid', 'fields' => $errors]];
    }
    $status = moderation($request);
    if (str_starts_with($status, 'venue_policy_')) {
        return [422, ['status' => 'rejected', 'reason' => $status]];
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
        $record = ['id' => $id, 'retryHash' => $retryHash,
            'cancelToken' => bin2hex(random_bytes(32))] + $request;
        changeStatus($record, $status);
        $records[$id] = $record;
        return [$status === 'confirmed' ? 201 : 202,
            summary($record) + ['cancelToken' => $record['cancelToken']], true];
    });
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' && array_key_exists('poster', $_GET)) {
        servePoster($_GET['poster']);
    } else {
        [$status, $body] = handle();
        reply($status, $body);
    }
} catch (Throwable $error) {
    error_log('CO-HUB community event store request failed');
    reply(503, ['status' => 'unavailable']);
}
