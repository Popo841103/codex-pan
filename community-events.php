<?php
declare(strict_types=1);
/**
 * CO-HUB community event requests for the official website.
 *
 * Source of truth for slot occupancy, once connected: this official site.
 * Times are Asia/Kuala_Lumpur. Bookable slot ids: 10-12, 14-17, 18-20, 20-2230.
 *
 * Statuses: pending_review, approved_waiting_poster, published, declined, cancelled.
 * approved_waiting_poster and published both occupy the slot. Decline and cancel release it.
 *
 * Review criteria (human, and any later assistant): do not approve requests that are
 * illegal, harassment, clearly unsuitable, or unhealthy or controversial
 * (内容不健康的、有争议的，不批准). If it is unclear whether content is unhealthy or
 * controversial, do not auto-approve; leave it for Xiaolin.
 *
 * Escalation SLA (documented, not executed here): if a request was escalated to Xiaolin
 * and she has not replied for more than 24 hours, AND the event start is still more than
 * 24 hours away (Asia/Kuala_Lumpur), a later WhatsApp assistant may decide per the criteria.
 * If fewer than 24 hours remain before the start, do not auto-decide; keep waiting.
 * Auto-approve stays off in this release even when that window is open, until occupancy
 * sync is connected and confirmed. Otherwise a host could be told a slot is reserved while
 * the public page still shows it as free. Clear-reason auto-decline is documented only.
 * This file has no switch that turns auto-approve on.
 *
 * AIWA hooks stay off unless COHUB_EVENTS_INTEGRATION=on and a server-only secret is set.
 * Those env values are not in the repo. Enabling the hook does not enable auto-approve
 * and does not mean sync has been confirmed. There is no inbound approve action.
 *
 * Optional later owner gate: COHUB_EVENTS_OWNER_TOKEN (server env only). When unset, the
 * unlisted approval page can review. Do not put a token in this file.
 */
const COHUB_EVENT_TZ = 'Asia/Kuala_Lumpur';
const COHUB_EVENT_SLOTS = [
    '10-12' => ['start' => '10:00', 'end' => '12:00'],
    '14-17' => ['start' => '14:00', 'end' => '17:00'],
    '18-20' => ['start' => '18:00', 'end' => '20:00'],
    '20-2230' => ['start' => '20:00', 'end' => '22:30'],
];
const COHUB_EVENT_STATUSES = ['pending_review', 'approved_waiting_poster', 'published', 'declined', 'cancelled'];
const COHUB_EVENT_TAKES_SLOT = ['approved_waiting_poster', 'published'];
const COHUB_EVENT_PAX = ['Under 10', "10\u{2013}20", "20\u{2013}30", 'Over 30'];
const COHUB_EVENT_REVIEW = [
    'illegal',
    'harassment',
    'clearly_unsuitable',
    'unhealthy',
    'controversial',
];

if (PHP_SAPI !== 'cli') {
    cohub_events_handle();
}

function cohub_events_handle(): void
{
    ini_set('display_errors', '0');
    try {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($method === 'GET' && isset($_GET['poster'])) {
            cohub_events_serve_poster((string)$_GET['poster']);
            return;
        }
        if ($method === 'GET') {
            $view = (string)($_GET['view'] ?? 'public');
            if ($view === 'integration') {
                cohub_events_json(200, cohub_events_contract());
            } elseif ($view === 'owner') {
                cohub_events_require_owner();
                cohub_events_json(200, cohub_events_with_store(static function (array $data): array {
                    return ['save' => false, 'body' => cohub_events_owner_body($data)];
                }));
            } elseif ($view === 'poster') {
                cohub_events_json(200, cohub_events_with_store(static function (array $data): array {
                    $event = cohub_events_find($data, (string)($_GET['id'] ?? ''));
                    $upload = (string)($_GET['upload'] ?? '');
                    if ($event === null || !cohub_events_upload_ok($event, $upload) || !in_array($event['status'], ['approved_waiting_poster', 'published'], true)) {
                        return ['save' => false, 'body' => ['ok' => false, 'error' => 'not_found'], 'status' => 404];
                    }
                    return ['save' => false, 'body' => ['ok' => true, 'event' => cohub_events_poster_view($event)]];
                }));
            } elseif ($view === 'public') {
                cohub_events_json(200, cohub_events_with_store(static function (array $data): array {
                    return ['save' => false, 'body' => cohub_events_public_body($data)];
                }));
            } else {
                cohub_events_json(404, ['ok' => false, 'error' => 'not_found']);
            }
            return;
        }
        if ($method !== 'POST') {
            cohub_events_json(405, ['ok' => false, 'error' => 'method_not_allowed']);
            return;
        }
        if (!cohub_events_origin_ok()) {
            cohub_events_json(403, ['ok' => false, 'error' => 'origin']);
            return;
        }
        $contentType = (string)($_SERVER['CONTENT_TYPE'] ?? '');
        if (stripos($contentType, 'multipart/form-data') !== false) {
            cohub_events_upload_poster();
            return;
        }
        $payload = json_decode(file_get_contents('php://input') ?: '', true);
        if (!is_array($payload)) {
            cohub_events_json(400, ['ok' => false, 'error' => 'bad_json']);
            return;
        }
        $action = (string)($payload['action'] ?? '');
        if ($action === 'integration') {
            cohub_events_integration($payload);
            return;
        }
        if ($action === 'create') {
            cohub_events_create($payload);
            return;
        }
        cohub_events_require_owner();
        if ($action === 'approve') {
            cohub_events_transition($payload, 'approved_waiting_poster', 'request.approved');
            return;
        }
        if ($action === 'decline') {
            cohub_events_transition($payload, 'declined', 'request.declined');
            return;
        }
        if ($action === 'cancel') {
            cohub_events_transition($payload, 'cancelled', 'request.cancelled');
            return;
        }
        cohub_events_json(400, ['ok' => false, 'error' => 'bad_action']);
    } catch (RuntimeException $e) {
        $code = $e->getMessage() === 'storage_unavailable' ? 'storage_unavailable' : 'server_error';
        cohub_events_json($code === 'storage_unavailable' ? 503 : 500, ['ok' => false, 'error' => $code]);
    }
}

function cohub_events_contract(): array
{
    $slots = [];
    foreach (COHUB_EVENT_SLOTS as $id => $span) {
        $slots[] = ['id' => $id, 'start' => $span['start'], 'end' => $span['end']];
    }
    return [
        'ok' => true,
        'hookConfigured' => cohub_events_integration_ready(),
        'liveSync' => false,
        'syncConfirmed' => false,
        'autoApproval' => false,
        'sourceOfTruth' => 'official-site',
        'timezone' => COHUB_EVENT_TZ,
        'openingHours' => ['start' => '09:00', 'end' => '23:30'],
        'slots' => $slots,
        'statuses' => COHUB_EVENT_STATUSES,
        'slotTakenStatuses' => COHUB_EVENT_TAKES_SLOT,
        'inbound' => ['check', 'snapshot', 'status'],
        'outbound' => ['request.created', 'request.approved', 'request.published', 'request.declined', 'request.cancelled'],
        'writesFromAiwa' => [],
        'reviewPolicy' => [
            'decline' => COHUB_EVENT_REVIEW,
            'unhealthyOrControversial' => 'do_not_approve',
            'ifUnclearWhetherUnhealthyOrControversial' => 'leave_for_xiaolin',
            'autoApproval' => false,
            'note' => 'Do not approve illegal, harassment, clearly unsuitable, unhealthy, or controversial content. If it is unclear whether content is unhealthy or controversial, do not auto-approve; leave it for Xiaolin.',
        ],
        'escalationSla' => cohub_events_sla_policy(),
        'whatsappTrailer' => ['Request ID', 'Slot ID', 'Date', 'Timezone'],
        'note' => 'Live occupancy sync and auto-approve are off. Turning on COHUB_EVENTS_INTEGRATION later does not by itself enable auto-approve. See docs/community-events.md.',
    ];
}

function cohub_events_sla_policy(): array
{
    return [
        'timezone' => COHUB_EVENT_TZ,
        'eventStart' => 'slot start, not slot end',
        'escalationClock' => 'createdAt on the official site (pending_review means Xiaolin has not decided here)',
        'waitAfterEscalation' => 'PT24H',
        'minimumLeadBeforeStart' => 'PT24H',
        'comparison' => 'more than 24 hours, not equal',
        'ifWaitExceededAndMoreThan24HoursBeforeStart' => 'a later assistant may decide per the review criteria and reply to the host',
        'if24HoursOrFewerBeforeStart' => 'do_not_auto_decide_keep_waiting_for_xiaolin',
        'autoApproveEnabled' => false,
        'autoDeclineEnabled' => false,
        'autoApproveBlockedReason' => 'Until official-site occupancy sync is connected and confirmed, auto-approve stays off even when the 24-hour SLA is met, so a host is never told a slot is reserved while the public page still shows it as free.',
        'autoDeclineClearRejectReasons' => 'documented_only_not_executed',
        'clearRejectReasons' => COHUB_EVENT_REVIEW,
        'enableAutoApproveOnlyAfter' => 'occupancy sync is connected and confirmed in a later change, not when this hook is first turned on',
        'thisReleaseExecutesSla' => false,
    ];
}

function cohub_events_integration_enabled(): bool
{
    $flag = getenv('COHUB_EVENTS_INTEGRATION');
    return is_string($flag) && in_array(strtolower(trim($flag)), ['1', 'on', 'true'], true);
}

function cohub_events_integration_secret(): string
{
    $secret = getenv('COHUB_EVENTS_INTEGRATION_SECRET');
    return is_string($secret) ? $secret : '';
}

function cohub_events_integration_ready(): bool
{
    return cohub_events_integration_enabled() && cohub_events_integration_secret() !== '';
}

function cohub_events_require_integration(): void
{
    if (!cohub_events_integration_enabled()) {
        cohub_events_json(403, ['ok' => false, 'error' => 'integration_disabled', 'autoApproval' => false, 'liveSync' => false]);
    }
    $secret = cohub_events_integration_secret();
    $given = (string)($_SERVER['HTTP_X_COHUB_INTEGRATION_SECRET'] ?? '');
    if ($secret === '' || $given === '' || !hash_equals($secret, $given)) {
        cohub_events_json(401, ['ok' => false, 'error' => 'integration_not_ready', 'autoApproval' => false]);
    }
}

function cohub_events_integration(array $payload): void
{
    cohub_events_require_integration();
    $command = (string)($payload['command'] ?? '');
    if (in_array($command, ['approve', 'decline', 'cancel', 'publish', 'auto_approve', 'auto_decline'], true)) {
        cohub_events_json(403, [
            'ok' => false,
            'error' => 'not_delegated',
            'autoApproval' => false,
            'message' => 'This hook cannot approve, decline, cancel, or publish. Auto-approve stays off until occupancy sync is connected and confirmed. Unclear unhealthy or controversial content stays with Xiaolin.',
        ]);
    }
    cohub_events_json(200, cohub_events_with_store(static function (array $data) use ($command, $payload): array {
        if ($command === 'check') {
            $date = (string)($payload['date'] ?? '');
            $slot = (string)($payload['slot'] ?? '');
            if (!cohub_events_valid_date($date) || !isset(COHUB_EVENT_SLOTS[$slot])) {
                return ['save' => false, 'body' => ['ok' => false, 'error' => 'bad_slot'], 'status' => 400];
            }
            $taken = cohub_events_slot_taken($data, $date, $slot, null);
            return ['save' => false, 'body' => ['ok' => true, 'date' => $date, 'slot' => $slot, 'free' => !$taken, 'timezone' => COHUB_EVENT_TZ, 'autoApproval' => false]];
        }
        if ($command === 'snapshot') {
            return ['save' => false, 'body' => ['ok' => true, 'timezone' => COHUB_EVENT_TZ, 'taken' => cohub_events_taken_slots($data), 'autoApproval' => false]];
        }
        if ($command === 'status') {
            $event = cohub_events_find($data, (string)($payload['requestId'] ?? ''));
            if ($event === null) {
                return ['save' => false, 'body' => ['ok' => false, 'error' => 'not_found'], 'status' => 404];
            }
            return ['save' => false, 'body' => ['ok' => true, 'request' => cohub_events_integration_status($event), 'autoApproval' => false]];
        }
        return ['save' => false, 'body' => ['ok' => false, 'error' => 'bad_action'], 'status' => 400];
    }));
}

function cohub_events_integration_status(array $event): array
{
    return [
        'requestId' => $event['id'],
        'status' => $event['status'],
        'date' => $event['date'],
        'slot' => $event['slot'],
        'title' => $event['title'],
        'eventStart' => cohub_events_slot_start($event['date'], $event['slot'])->format('c'),
        'escalatedAt' => $event['escalatedAt'],
        'slotTaken' => in_array($event['status'], COHUB_EVENT_TAKES_SLOT, true),
        'sla' => cohub_events_sla_assessment($event),
    ];
}

function cohub_events_sla_assessment(array $event, ?DateTimeImmutable $now = null): array
{
    $tz = new DateTimeZone(COHUB_EVENT_TZ);
    $now = $now ?? new DateTimeImmutable('now', $tz);
    $escalated = new DateTimeImmutable((string)($event['escalatedAt'] ?? $event['createdAt']), $tz);
    $start = cohub_events_slot_start((string)$event['date'], (string)$event['slot']);
    $since = ($now->getTimestamp() - $escalated->getTimestamp()) / 3600;
    $before = ($start->getTimestamp() - $now->getTimestamp()) / 3600;
    $pending = ($event['status'] ?? '') === 'pending_review';
    $window = $pending && $since > 24 && $before > 24;
    if (!$pending) {
        $reason = 'already_decided';
    } elseif ($before <= 24) {
        $reason = 'too_close_to_event_start';
    } elseif ($since <= 24) {
        $reason = 'waiting_for_xiaolin';
    } else {
        $reason = 'window_open_but_auto_approve_disabled_until_sync_confirmed';
    }
    return [
        'timezone' => COHUB_EVENT_TZ,
        'waitHours' => 24,
        'leadHours' => 24,
        'hoursSinceEscalation' => round($since, 2),
        'hoursBeforeStart' => round($before, 2),
        'windowOpen' => $window,
        'autoApprovePermitted' => false,
        'autoDeclinePermitted' => false,
        'siteAction' => 'none',
        'reason' => $reason,
        'clearRejectReasonsDocumentedOnly' => COHUB_EVENT_REVIEW,
        'ifUnclear' => 'leave_for_xiaolin',
    ];
}

function cohub_events_create(array $payload): void
{
    cohub_events_json(200, cohub_events_with_store(static function (array &$data) use ($payload): array {
        cohub_events_rate_limit($data);
        $fields = cohub_events_clean_request($payload);
        if ($fields === null) {
            return ['save' => true, 'body' => ['ok' => false, 'error' => 'bad_request'], 'status' => 400];
        }
        $id = (string)($payload['id'] ?? '');
        if (!cohub_events_valid_id($id)) {
            $id = cohub_events_new_id();
        }
        $existing = cohub_events_find($data, $id);
        if ($existing !== null) {
            $same = $existing['name'] === $fields['name'] && $existing['contact'] === $fields['contact'] && $existing['title'] === $fields['title'] && $existing['date'] === $fields['date'] && $existing['slot'] === $fields['slot'];
            if (!$same) {
                return ['save' => false, 'body' => ['ok' => false, 'error' => 'conflict'], 'status' => 409];
            }
            return ['save' => false, 'body' => ['ok' => true, 'id' => $id, 'status' => $existing['status']]];
        }
        if (cohub_events_slot_taken($data, $fields['date'], $fields['slot'], null)) {
            return ['save' => false, 'body' => ['ok' => false, 'error' => 'slot_taken'], 'status' => 409];
        }
        $now = cohub_events_now();
        $event = $fields + [
            'id' => $id,
            'status' => 'pending_review',
            'uploadToken' => bin2hex(random_bytes(16)),
            'posterFile' => '',
            'createdAt' => $now,
            'escalatedAt' => $now,
            'updatedAt' => $now,
        ];
        if (count($data['events']) > 2000) {
            return ['save' => false, 'body' => ['ok' => false, 'error' => 'storage_full'], 'status' => 503];
        }
        array_unshift($data['events'], $event);
        cohub_events_notify('request.created', $event);
        return ['save' => true, 'body' => ['ok' => true, 'id' => $id, 'status' => 'pending_review']];
    }));
}

function cohub_events_transition(array $payload, string $status, string $type): void
{
    cohub_events_json(200, cohub_events_with_store(static function (array &$data) use ($payload, $status, $type): array {
        $event = cohub_events_find_ref($data, (string)($payload['id'] ?? ''));
        if ($event === null) {
            return ['save' => false, 'body' => ['ok' => false, 'error' => 'not_found'], 'status' => 404];
        }
        $from = $event['status'];
        $allowed = [
            'approved_waiting_poster' => ['pending_review'],
            'declined' => ['pending_review'],
            'cancelled' => ['approved_waiting_poster', 'published'],
        ];
        if (!in_array($from, $allowed[$status], true)) {
            return ['save' => false, 'body' => ['ok' => false, 'error' => 'bad_status'], 'status' => 409];
        }
        if ($status === 'approved_waiting_poster' && cohub_events_slot_taken($data, $event['date'], $event['slot'], $event['id'])) {
            return ['save' => false, 'body' => ['ok' => false, 'error' => 'slot_taken'], 'status' => 409];
        }
        $event['status'] = $status;
        $event['updatedAt'] = cohub_events_now();
        cohub_events_replace($data, $event);
        cohub_events_notify($type, $event);
        return ['save' => true, 'body' => ['ok' => true, 'event' => cohub_events_owner_event($event)]];
    }));
}

function cohub_events_upload_poster(): void
{
    $id = (string)($_POST['id'] ?? '');
    $upload = (string)($_POST['upload'] ?? '');
    $file = $_FILES['poster'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        cohub_events_json(400, ['ok' => false, 'error' => 'bad_file']);
    }
    if (($file['size'] ?? 0) < 32 || ($file['size'] ?? 0) > 5 * 1024 * 1024) {
        cohub_events_json(400, ['ok' => false, 'error' => 'bad_file']);
    }
    $ext = cohub_events_image_ext((string)$file['tmp_name']);
    if ($ext === null) {
        cohub_events_json(400, ['ok' => false, 'error' => 'bad_file']);
    }
    cohub_events_json(200, cohub_events_with_store(static function (array &$data) use ($id, $upload, $file, $ext): array {
        $event = cohub_events_find_ref($data, $id);
        if ($event === null || !cohub_events_upload_ok($event, $upload)) {
            return ['save' => false, 'body' => ['ok' => false, 'error' => 'not_found'], 'status' => 404];
        }
        if (!in_array($event['status'], ['approved_waiting_poster', 'published'], true)) {
            return ['save' => false, 'body' => ['ok' => false, 'error' => 'not_approved'], 'status' => 409];
        }
        $dir = cohub_events_dir() . '/posters';
        $basename = $event['id'] . '.' . $ext;
        $target = $dir . '/' . $basename;
        if (!move_uploaded_file((string)$file['tmp_name'], $target)) {
            throw new RuntimeException('storage_unavailable');
        }
        @chmod($target, 0640);
        if ($event['posterFile'] !== '' && $event['posterFile'] !== $basename) {
            $old = $dir . '/' . $event['posterFile'];
            if (is_file($old)) {
                @unlink($old);
            }
        }
        $first = $event['status'] !== 'published';
        $event['posterFile'] = $basename;
        $event['status'] = 'published';
        $event['updatedAt'] = cohub_events_now();
        cohub_events_replace($data, $event);
        if ($first) {
            cohub_events_notify('request.published', $event);
        }
        return ['save' => true, 'body' => ['ok' => true, 'id' => $event['id'], 'status' => 'published']];
    }));
}

function cohub_events_notify(string $type, array $event): void
{
    if (!cohub_events_integration_ready()) {
        return;
    }
    $url = getenv('COHUB_EVENTS_INTEGRATION_URL');
    if (!is_string($url) || !preg_match('#^https://#', $url)) {
        return;
    }
    $body = json_encode([
        'type' => $type,
        'requestId' => $event['id'],
        'status' => $event['status'],
        'date' => $event['date'],
        'slot' => $event['slot'],
        'timezone' => COHUB_EVENT_TZ,
        'slotTaken' => in_array($event['status'], COHUB_EVENT_TAKES_SLOT, true),
        'title' => $event['title'],
        'autoApproval' => false,
    ], JSON_UNESCAPED_UNICODE);
    if ($body === false) {
        return;
    }
    $headers = "Content-Type: application/json\r\nX-Cohub-Integration-Secret: " . cohub_events_integration_secret() . "\r\n";
    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => $headers,
        'content' => $body,
        'timeout' => 2,
        'ignore_errors' => true,
    ]]);
    try {
        @file_get_contents($url, false, $context);
    } catch (Throwable $e) {
        // A missed notification must not block the host or Xiaolin. The site remains source of truth.
    }
}

function cohub_events_public_body(array $data): array
{
    $events = [];
    foreach ($data['events'] as $event) {
        if ($event['status'] === 'published' && $event['posterFile'] !== '') {
            $events[] = [
                'id' => $event['id'],
                'date' => $event['date'],
                'slot' => $event['slot'],
                'title' => $event['title'],
                'intro' => $event['intro'],
                'poster' => 'community-events.php?poster=' . rawurlencode($event['id']),
            ];
        }
    }
    return ['ok' => true, 'timezone' => COHUB_EVENT_TZ, 'events' => $events, 'booked' => cohub_events_taken_slots($data)];
}

function cohub_events_owner_body(array $data): array
{
    $groups = ['pending_review' => [], 'approved_waiting_poster' => [], 'published' => []];
    foreach ($data['events'] as $event) {
        if (isset($groups[$event['status']])) {
            $groups[$event['status']][] = cohub_events_owner_event($event);
        }
    }
    return [
        'ok' => true,
        'ownerTokenRequired' => cohub_events_owner_token() !== '',
        'events' => $groups,
    ];
}

function cohub_events_owner_event(array $event): array
{
    return [
        'id' => $event['id'],
        'status' => $event['status'],
        'name' => $event['name'],
        'contact' => $event['contact'],
        'title' => $event['title'],
        'pax' => $event['pax'],
        'date' => $event['date'],
        'slot' => $event['slot'],
        'intro' => $event['intro'],
        'note' => $event['note'],
        'uploadToken' => $event['uploadToken'],
        'escalatedAt' => $event['escalatedAt'],
        'eventStart' => cohub_events_slot_start($event['date'], $event['slot'])->format('c'),
    ];
}

function cohub_events_poster_view(array $event): array
{
    return [
        'id' => $event['id'],
        'status' => $event['status'],
        'title' => $event['title'],
        'intro' => $event['intro'],
        'date' => $event['date'],
        'slot' => $event['slot'],
    ];
}

function cohub_events_taken_slots(array $data): array
{
    $taken = [];
    foreach ($data['events'] as $event) {
        if (in_array($event['status'], COHUB_EVENT_TAKES_SLOT, true)) {
            $taken[] = ['date' => $event['date'], 'slot' => $event['slot']];
        }
    }
    return $taken;
}

function cohub_events_slot_taken(array $data, string $date, string $slot, ?string $exceptId): bool
{
    foreach ($data['events'] as $event) {
        if ($exceptId !== null && $event['id'] === $exceptId) {
            continue;
        }
        if ($event['date'] === $date && $event['slot'] === $slot && in_array($event['status'], COHUB_EVENT_TAKES_SLOT, true)) {
            return true;
        }
    }
    return false;
}

function cohub_events_clean_request(array $payload): ?array
{
    $date = (string)($payload['date'] ?? '');
    $slot = (string)($payload['slot'] ?? '');
    $pax = (string)($payload['pax'] ?? '');
    $name = cohub_events_text($payload['name'] ?? '', 80);
    $contact = cohub_events_text($payload['contact'] ?? '', 120);
    $title = cohub_events_text($payload['title'] ?? '', 80);
    $intro = cohub_events_text($payload['intro'] ?? '', 400);
    $note = cohub_events_text($payload['note'] ?? '', 400);
    if ($name === '' || $contact === '' || $title === '' || $intro === '' || !in_array($pax, COHUB_EVENT_PAX, true) || !isset(COHUB_EVENT_SLOTS[$slot]) || !cohub_events_valid_date($date) || $date < cohub_events_today() || $date > cohub_events_today_plus(400)) {
        return null;
    }
    return compact('name', 'contact', 'title', 'pax', 'date', 'slot', 'intro', 'note');
}

function cohub_events_text($value, int $max): string
{
    $text = str_replace(["\r\n", "\r"], "\n", (string)$value);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    $text = trim($text);
    if (preg_match('/^.{0,' . $max . '}/us', $text, $match)) {
        return $match[0];
    }
    return '';
}

function cohub_events_valid_date(string $date): bool
{
    $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone(COHUB_EVENT_TZ));
    return $dt instanceof DateTimeImmutable && $dt->format('Y-m-d') === $date;
}

function cohub_events_valid_id(string $id): bool
{
    return (bool)preg_match('/^req_[a-f0-9]{32}$/', $id);
}

function cohub_events_new_id(): string
{
    return 'req_' . bin2hex(random_bytes(16));
}

function cohub_events_upload_ok(array $event, string $upload): bool
{
    $token = (string)($event['uploadToken'] ?? '');
    return $token !== '' && $upload !== '' && hash_equals($token, $upload);
}

function cohub_events_slot_start(string $date, string $slot): DateTimeImmutable
{
    $start = COHUB_EVENT_SLOTS[$slot]['start'] ?? '00:00';
    return new DateTimeImmutable($date . ' ' . $start . ':00', new DateTimeZone(COHUB_EVENT_TZ));
}

function cohub_events_today(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone(COHUB_EVENT_TZ)))->format('Y-m-d');
}

function cohub_events_today_plus(int $days): string
{
    return (new DateTimeImmutable('now', new DateTimeZone(COHUB_EVENT_TZ)))->modify('+' . $days . ' days')->format('Y-m-d');
}

function cohub_events_now(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone(COHUB_EVENT_TZ)))->format('c');
}

function cohub_events_image_ext(string $path): ?string
{
    $handle = fopen($path, 'rb');
    if ($handle === false) {
        return null;
    }
    $bytes = fread($handle, 16) ?: '';
    fclose($handle);
    if (str_starts_with($bytes, "\xFF\xD8\xFF")) {
        return 'jpg';
    }
    if (str_starts_with($bytes, "\x89PNG\r\n\x1A\n")) {
        return 'png';
    }
    if (strlen($bytes) >= 12 && substr($bytes, 0, 4) === 'RIFF' && substr($bytes, 8, 4) === 'WEBP') {
        return 'webp';
    }
    return null;
}

function cohub_events_serve_poster(string $id): void
{
    if (!cohub_events_valid_id($id)) {
        http_response_code(404);
        exit;
    }
    $path = '';
    $ext = '';
    cohub_events_with_store(static function (array $data) use ($id, &$path, &$ext): array {
        $event = cohub_events_find($data, $id);
        if ($event === null || $event['status'] !== 'published' || $event['posterFile'] === '') {
            return ['save' => false, 'body' => null];
        }
        if (!preg_match('/^req_[a-f0-9]{32}\.(jpg|png|webp)$/', $event['posterFile'])) {
            return ['save' => false, 'body' => null];
        }
        $path = cohub_events_dir() . '/posters/' . $event['posterFile'];
        $ext = pathinfo($event['posterFile'], PATHINFO_EXTENSION);
        return ['save' => false, 'body' => null];
    });
    $root = realpath(cohub_events_dir() . '/posters');
    $real = $path !== '' ? realpath($path) : false;
    if ($root === false || $real === false || !str_starts_with($real, $root . DIRECTORY_SEPARATOR)) {
        http_response_code(404);
        exit;
    }
    $types = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    header('Content-Type: ' . $types[$ext]);
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=300');
    header('Content-Length: ' . (string)filesize($real));
    readfile($real);
    exit;
}

function cohub_events_rate_limit(array &$data): void
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $now = time();
    $stamps = array_values(array_filter($data['rates'][$ip] ?? [], static fn($stamp) => is_int($stamp) && $stamp > $now - 3600));
    if (count($stamps) >= 60) {
        cohub_events_json(429, ['ok' => false, 'error' => 'rate_limit']);
    }
    $stamps[] = $now;
    $data['rates'][$ip] = $stamps;
    if (count($data['rates']) > 50) {
        $data['rates'] = array_slice($data['rates'], -50, null, true);
    }
}

function cohub_events_find(array $data, string $id): ?array
{
    if (!cohub_events_valid_id($id)) {
        return null;
    }
    foreach ($data['events'] as $event) {
        if ($event['id'] === $id) {
            return $event;
        }
    }
    return null;
}

function cohub_events_find_ref(array &$data, string $id): ?array
{
    return cohub_events_find($data, $id);
}

function cohub_events_replace(array &$data, array $event): void
{
    foreach ($data['events'] as $index => $current) {
        if ($current['id'] === $event['id']) {
            $data['events'][$index] = $event;
            return;
        }
    }
}

function cohub_events_owner_token(): string
{
    $token = getenv('COHUB_EVENTS_OWNER_TOKEN');
    return is_string($token) ? $token : '';
}

function cohub_events_require_owner(): void
{
    $expected = cohub_events_owner_token();
    if ($expected === '') {
        return;
    }
    $given = (string)($_SERVER['HTTP_X_COHUB_OWNER_TOKEN'] ?? '');
    if ($given === '' || !hash_equals($expected, $given)) {
        cohub_events_json(401, ['ok' => false, 'error' => 'owner_token_required']);
    }
}

function cohub_events_origin_ok(): bool
{
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') {
        return true;
    }
    $parts = parse_url($origin);
    $host = preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''));
    return is_array($parts) && isset($parts['host'], $host) && strcasecmp((string)$parts['host'], (string)$host) === 0;
}

function cohub_events_dir(): string
{
    $env = getenv('COHUB_EVENTS_DIR');
    if (is_string($env) && $env !== '') {
        return cohub_events_ensure_dir($env);
    }
    $production = '/var/lib/cohub-community-events';
    if ((is_dir($production) && is_writable($production)) || @mkdir($production, 0700, true)) {
        if (is_dir($production) && is_writable($production)) {
            return cohub_events_ensure_dir($production);
        }
    }
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    if (in_array($remote, ['127.0.0.1', '::1'], true)) {
        return cohub_events_ensure_dir(sys_get_temp_dir() . '/cohub-community-events');
    }
    throw new RuntimeException('storage_unavailable');
}

function cohub_events_ensure_dir(string $dir): string
{
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('storage_unavailable');
    }
    $posters = $dir . '/posters';
    if (!is_dir($posters) && !@mkdir($posters, 0700, true) && !is_dir($posters)) {
        throw new RuntimeException('storage_unavailable');
    }
    return $dir;
}

function cohub_events_with_store(callable $mutator): mixed
{
    $dir = cohub_events_dir();
    $path = $dir . '/store.json';
    $handle = fopen($path, 'c+');
    if ($handle === false) {
        throw new RuntimeException('storage_unavailable');
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            throw new RuntimeException('storage_unavailable');
        }
        $raw = stream_get_contents($handle);
        $data = json_decode($raw ?: '', true);
        if (!is_array($data) || !isset($data['events']) || !is_array($data['events'])) {
            $data = ['events' => [], 'rates' => []];
        }
        if (!isset($data['rates']) || !is_array($data['rates'])) {
            $data['rates'] = [];
        }
        $result = $mutator($data);
        if (!empty($result['save'])) {
            $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            if ($json === false) {
                throw new RuntimeException('storage_unavailable');
            }
            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, $json);
            fflush($handle);
            @chmod($path, 0600);
        }
        if (isset($result['status']) && (int)$result['status'] !== 200) {
            cohub_events_json((int)$result['status'], $result['body']);
        }
        return $result['body'];
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function cohub_events_json(int $status, array $body): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP);
    exit;
}
