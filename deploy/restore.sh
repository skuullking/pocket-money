#!/bin/sh
# Remplace le contenu de la base par une sauvegarde. Arrêter l'application d'abord.
set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "usage: restore.sh /backups/pocketmoney-AAAAMMJJTHHMMSSZ.dump" >&2
  ls -1 /backups >&2
  exit 1
fi
if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "Refus : cette commande écrase la base $PGDATABASE. Relancer avec CONFIRM_RESTORE=yes." >&2
  exit 1
fi

pg_restore --clean --if-exists --no-owner --dbname="$PGDATABASE" "$1"
echo "restauration terminée depuis $1"
