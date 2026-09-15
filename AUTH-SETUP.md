# Вход через сервисы

Сайт: https://employees-trainer.gidronic25.workers.dev/

Публичная политика конфиденциальности: https://employees-trainer.gidronic25.workers.dev/privacy

В Supabase → Authentication → URL Configuration укажите этот адрес как Site URL и добавьте его в Redirect URLs. Для разработки отдельно разрешите `http://127.0.0.1:5173/`.

## Google

1. В Google Auth Platform настройте аудиторию приложения и создайте OAuth Client типа Web application.
2. Authorized JavaScript origin: `https://employees-trainer.gidronic25.workers.dev`.
3. Authorized redirect URI: `https://tywvxpgudcdgauhtkofw.supabase.co/auth/v1/callback`.
4. В Supabase → Authentication → Sign In / Providers → Google сохраните Client ID и Client Secret и включите провайдера. Для обычного входа достаточно профиля и email.
5. Проверьте вход в отдельном окне, возврат на сайт, выход и повторный вход. В режиме Testing Google допускает только добавленных тестовых пользователей.

Кнопка Google появится автоматически, когда публичные настройки Supabase сообщат, что провайдер включён. Секреты OAuth хранятся только в кабинете Supabase, никогда в переменных VITE_* или GitHub.

Официальная инструкция: https://supabase.com/docs/guides/auth/social-login/auth-google

## GitHub

1. Откройте https://github.com/settings/applications/new под своим аккаунтом.
2. Заполните Application name: `Тренажёр сотрудников`.
3. Homepage URL: `https://employees-trainer.gidronic25.workers.dev/`.
4. Authorization callback URL: `https://tywvxpgudcdgauhtkofw.supabase.co/auth/v1/callback`.
5. Device Flow оставьте выключенным. Нажмите Register application, затем Generate a new client secret.
6. В Supabase → Authentication → Sign In / Providers → GitHub включите провайдера, перенесите Client ID и Client Secret, сохраните.
7. Откройте сайт в новом окне: кнопка GitHub должна появиться. Проверьте вход, возврат на сайт, выход и повторный вход.

Подключение GitHub к Codex не создаёт OAuth-приложение вашего сайта: это отдельная настройка.
Инструкция: https://supabase.com/docs/guides/auth/social-login/auth-github

## Telegram

В коде подготовлен провайдер `custom:telegram`; кнопка скрыта, пока он не включён на сервере. Сквозной вход пока не проверен: приложение Telegram ещё не настроено.

1. Создайте бота для сайта через https://t.me/BotFather. В mini app BotFather выберите бота → Login Widget.
2. В Supabase → Authentication → Sign In / Providers → New Provider выберите Auto-discovery (OIDC), идентификатор `custom:telegram`, Issuer URL `https://oauth.telegram.org`.
3. Скопируйте Callback URL именно из формы Supabase. Добавьте его и `https://employees-trainer.gidronic25.workers.dev` в Allowed URLs BotFather.
4. Перенесите Client ID и Client Secret из Login Widget в Supabase. Это OAuth-секрет, не токен Bot API.
5. Scopes: `openid profile`. Разрешите вход без email (`email_optional: true`), поскольку Telegram его не предоставляет. PKCE и проверку nonce оставьте включёнными.
6. Включите провайдера и проверьте вход, сохранение сессии и выход. Телефон и разрешение писать сообщения для тренажёра не нужны.

Telegram не передаёт email, поэтому первый вход через него может создать отдельный аккаунт без прежних списков. Не считайте его автоматическим подключением к существующему email-аккаунту.

Источники: https://core.telegram.org/bots/telegram-login и https://supabase.com/docs/guides/auth/custom-oauth-providers

## ВКонтакте / VK ID

Встроенного провайдера `vk` в используемом Supabase нет. Потребуется приложение VK ID и проверенная интеграция с Custom OAuth/OIDC Provider (либо отдельный серверный адаптер, если протокол VK ID требует дополнительных параметров, которые нельзя передать штатно).

После настройки и проверки провайдера его идентификатор вида `custom:vk` задаётся в `VITE_VK_AUTH_PROVIDER`. Кнопка показывается только если этот идентификатор включён в настройках сервера. Сейчас интеграция VK ID не настроена и её совместимость с конкретным приложением не проверена. Не включайте фиктивного провайдера для отображения кнопки.

Документация: https://supabase.com/docs/guides/auth/custom-oauth-providers

## Проверено 14 сентября 2026

База восстановлена из приостановленного состояния; статус ACTIVE_HEALTHY и тестовый SELECT успешны. В публичных настройках включён только email; Google и GitHub отключены. Пользователь подтвердил, что приложения OAuth ещё не создавались. Вход через внешние сервисы требует завершения настроек выше.

15 сентября: Google Auth Platform завершает открытие ошибкой соединения ERR_CONNECTION_CLOSED. Доступ автоматизированного браузера к кабинету VK ID заблокирован политикой инструмента.

GitHub OAuth App создано: https://github.com/settings/applications/3859765. Client ID: `Ov23lir72QO9S4mNJyY4`. Секрет создан, в репозитории не хранится. Осталось сохранить Client ID и Client Secret в провайдере GitHub проекта Supabase, включить провайдера и проверить сквозной вход. На момент записи успешный вход через GitHub ещё не подтверждён.
