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

Можно также зарегистрировать OAuth App в GitHub с Homepage URL сайта и тем же callback Supabase, затем включить GitHub в Supabase Providers. Код уже поддерживает этот вариант и показывает кнопку только после включения провайдера.

## ВКонтакте / VK ID

Встроенного провайдера `vk` в используемом Supabase нет. Потребуется приложение VK ID и проверенная интеграция с Custom OAuth/OIDC Provider (либо отдельный серверный адаптер, если протокол VK ID требует дополнительных параметров, которые нельзя передать штатно).

После настройки и проверки провайдера его идентификатор вида `custom:vk` задаётся в `VITE_VK_AUTH_PROVIDER`. Кнопка показывается только если этот идентификатор включён в настройках сервера. Сейчас интеграция VK ID не настроена и её совместимость с конкретным приложением не проверена. Не включайте фиктивного провайдера для отображения кнопки.

Документация: https://supabase.com/docs/guides/auth/custom-oauth-providers

## Проверено 14 сентября 2026

База восстановлена из приостановленного состояния; статус ACTIVE_HEALTHY и тестовый SELECT успешны. В публичных настройках включён только email; Google и GitHub отключены. Пользователь подтвердил, что приложения OAuth ещё не создавались. Вход через внешние сервисы требует завершения настроек выше.

15 сентября: попытка открыть Google Auth Platform завершилась ошибкой соединения ERR_CONNECTION_CLOSED. Доступ автоматизированного браузера к кабинету VK ID заблокирован политикой инструмента. Приложения и секреты не созданы; внешняя авторизация пока не включена.
